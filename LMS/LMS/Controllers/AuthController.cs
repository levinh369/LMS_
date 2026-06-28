using LMS.DTOs.Request;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class AuthController : ControllerBase
    {
        private IAuthService authService;
        private readonly IUserService userService;
        public AuthController(IAuthService authService, IUserService userService)
        {
            this.authService = authService;
            this.userService = userService;
        }
        [HttpPost("login")]
        public async Task<IActionResult> LoginAsync([FromBody] LoginRequestDTO dto)
        {
            try
            {
                var result = await authService.LoginAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }
        [HttpPost("register")]
        public async Task<IActionResult> RegisterAsync([FromBody] RegisterRequestDTO dto)
        {
            var result = await authService.RegisterAsync(dto);
            return Ok(result);
        }
        [HttpGet("external-callback")]
        public async Task<IActionResult> ExternalCallback()
        {
            var result = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            // 📍 1. Bốc cái returnUrl từ Properties ra trước để biết Frontend đang gọi từ đâu (Local hay Deploy)
            string returnUrl = null;
            if (result != null && result.Properties != null && result.Properties.Items.ContainsKey("TunnedReturnUrl"))
            {
                returnUrl = result.Properties.Items["TunnedReturnUrl"];
            }

            // 📍 SỬA LẠI: Dùng Request.Host.Value cho cả hai vế để tránh lỗi CS1061
            string defaultFrontendUrl = Request.Host.Value.Contains("localhost") || Request.Host.Value.Contains("127.0.0.1")
                ? "http://127.0.0.1:5500/pages/auth/login-success.html" // Link Front local của bác
                : "https://lms-azure-mu.vercel.app/auth/login-success.html"; // Link Front deploy
            if (!result.Succeeded)
            {
                string errorUrl = defaultFrontendUrl.Replace("login-success.html", "login.html?error=external_auth_failed");
                return Redirect(errorUrl);
            }

            var provider = result.Properties.Items[".AuthScheme"] ?? "Unknown";
            var email = result.Principal.FindFirstValue(ClaimTypes.Email);
            var name = result.Principal.FindFirstValue(ClaimTypes.Name);
            var externalId = result.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var avatar = result.Principal.FindFirst("picture")?.Value ?? result.Principal.FindFirst("image")?.Value;

            var user = await userService.GetOrCreateExternalUserAsync(email, name, avatar, externalId, provider);
            var tokens = authService.GenerateTokens(user);

            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            // --- LOGIC ĐIỀU HƯỚNG ---
            var finalBaseUrl = string.IsNullOrEmpty(returnUrl) ? defaultFrontendUrl : returnUrl;

            // Tự động dọn sạch chữ /pages nếu phía Frontend truyền lên sót link cũ
            //if (finalBaseUrl.Contains("/pages/auth/"))
            //{
            //    finalBaseUrl = finalBaseUrl.Replace("/pages/auth/", "/auth/");
            //}

            string separator = finalBaseUrl.Contains("?") ? "&" : "?";

            // Mã hóa bảo mật các tham số truyền trên URL đường dẫn quay về
            var finalRedirectUrl = $"{finalBaseUrl}{separator}" +
                 $"token={Uri.EscapeDataString(tokens.AccessToken)}" +
                 $"&refreshToken={Uri.EscapeDataString(tokens.RefreshToken ?? "")}" +
                 $"&userId={user.Id}" +
                 $"&username={Uri.EscapeDataString(user.FullName ?? "")}" +
                 $"&email={Uri.EscapeDataString(user.Email ?? "")}" +
                 $"&avatar={Uri.EscapeDataString(user.AvatarUrl ?? "")}" +
                 $"&role={user.RoleId}";

            return Redirect(finalRedirectUrl);
        }

        [AllowAnonymous]
        [HttpGet("external-login")]
        public IActionResult ExternalLogin(string provider, string returnUrl = null)
        {
            if (string.IsNullOrEmpty(provider))
            {
                return BadRequest("Provider không được để trống.");
            }

            // Đường dẫn tĩnh sạch sẽ gửi cho Google
            var redirectUrl = Url.Action("ExternalCallback", "Auth");

            var properties = new AuthenticationProperties { RedirectUri = redirectUrl };

            // Giấu returnUrl vào ví bảo mật Properties
            if (!string.IsNullOrEmpty(returnUrl))
            {
                properties.Items["TunnedReturnUrl"] = returnUrl;
            }

            return Challenge(properties, provider);
        }
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(new { Success = false, Message = "Email không được để trống!" });

            try
            {
                // Gọi xuống Service để xử lý
                await authService.ForgotPasswordAsync(request.Email);

                // Trả về báo thành công
                return Ok(new { Success = true, Message = "Mã xác nhận đã được gửi đến email của bạn." });
            }
            catch (Exception ex)
            {
                // Có thể là lỗi "Email không tồn tại" hoặc lỗi không gửi được mail
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }
        [HttpPost("verify-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.OtpCode))
                return BadRequest(new { Success = false, Message = "Thiếu thông tin xác thực!" });

            try
            {
                // Gọi Service kiểm tra mã và hạn sử dụng
                await authService.VerifyOtpAsync(request.Email, request.OtpCode);
                return Ok(new { Success = true, Message = "Mã xác nhận hợp lệ." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
                return BadRequest(new { Success = false, Message = "Mật khẩu mới phải có ít nhất 6 ký tự!" });

            try
            {
                // Gọi Service để đổi mật khẩu
                await authService.ResetPasswordAsync(request.Email, request.OtpCode, request.NewPassword);
                return Ok(new { Success = true, Message = "Mật khẩu đã được đặt lại thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }
        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDTO request)
        {
            if (string.IsNullOrEmpty(request.RefreshToken))
            {
                return BadRequest(new { success = false, message = "Không tìm thấy Refresh Token!" });
            }

            try
            {
                // Giao toàn bộ việc nặng nhọc cho Service
                var response = await authService.RefreshTokenAsync(request);

                return Ok(new
                {
                    success = true,
                    accessToken = response.AccessToken,
                    refreshToken = response.RefreshToken
                });
            }
            catch (Exception ex)
            {
                return Unauthorized(new { success = false, message = ex.Message });
            }
        }
    }
}
