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
        public async Task<IActionResult> ExternalCallback(string returnUrl = null)
        {
            var result = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            // Link mặc định nếu không có returnUrl (Sửa localhost thành link Vercel của ông)
            string defaultVercelUrl = "https://lms-azure-mu.vercel.app/pages/auth/login-success.html";

            if (!result.Succeeded)
            {
                // Chỗ này cũng phải sửa localhost thành Vercel
                return Redirect("https://lms-azure-mu.vercel.app/pages/auth/login.html?error=external_auth_failed");
            }

            var provider = result.Properties.Items[".AuthScheme"] ?? "Unknown";
            var email = result.Principal.FindFirstValue(ClaimTypes.Email);
            var name = result.Principal.FindFirstValue(ClaimTypes.Name);
            var externalId = result.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var avatar = result.Principal.FindFirst("picture")?.Value ?? result.Principal.FindFirst("image")?.Value;

            var user = await userService.GetOrCreateExternalUserAsync(email, name, avatar, externalId, provider);
            var tokens = authService.GenerateTokens(user);

            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            // --- LOGIC ĐIỀU HƯỚNG LINH HOẠT ---
            // Nếu returnUrl gửi lên từ JS là localhost, nó sẽ dùng cái đó. 
            // Nếu không có hoặc lỗi, nó dùng defaultVercelUrl.
            var finalBaseUrl = string.IsNullOrEmpty(returnUrl) ? defaultVercelUrl : returnUrl;

            string separator = finalBaseUrl.Contains("?") ? "&" : "?";

            var finalRedirectUrl = $"{finalBaseUrl}{separator}" +
                 $"token={tokens.AccessToken}" +
                 $"&refreshToken={tokens.RefreshToken}" + 
                 $"&userId={user.Id}" +
                 $"&username={Uri.EscapeDataString(user.FullName)}" +
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

            // Gửi kèm returnUrl vào tham số của ExternalCallback
            var redirectUrl = Url.Action("ExternalCallback", "Auth", new { returnUrl });

            var properties = new AuthenticationProperties { RedirectUri = redirectUrl };

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
