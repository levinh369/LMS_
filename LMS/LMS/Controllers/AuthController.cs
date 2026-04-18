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
            var result = await authService.LoginAsync(dto);
            if (result == null)
            {
                return Unauthorized(new { message = "Email hoặc mật khẩu không chính xác!" });
            }

            return Ok(result);
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
            // 1. Xác thực dựa trên Cookie tạm thời
            var result = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            if (!result.Succeeded)
                return Redirect("http://127.0.0.1:5500/pages/auth/login.html?error=external_auth_failed");

            // 2 & 3. Trích xuất thông tin (Giữ nguyên logic của Vinh)
            var provider = result.Properties.Items[".AuthScheme"] ?? "Unknown";
            var email = result.Principal.FindFirstValue(ClaimTypes.Email);
            var name = result.Principal.FindFirstValue(ClaimTypes.Name);
            var externalId = result.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var avatar = result.Principal.FindFirst("picture")?.Value ?? result.Principal.FindFirst("image")?.Value;

            // 4 & 5. DB và JWT (Giữ nguyên logic của Vinh)
            var user = await userService.GetOrCreateExternalUserAsync(email, name, avatar, externalId, provider);
            var token = authService.GenerateJwtToken(user);

            // 6. DỌN DẸP
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            // --- LOGIC ĐIỀU HƯỚNG LINH HOẠT ---
            // Nếu không có returnUrl thì về trang success mặc định
            var finalBaseUrl = string.IsNullOrEmpty(returnUrl)
                               ? "http://127.0.0.1:5500/pages/auth/login-success.html"
                               : returnUrl;

            // Kiểm tra xem URL gốc đã có dấu "?" chưa để nối thêm Token cho đúng
            string separator = finalBaseUrl.Contains("?") ? "&" : "?";

            var finalRedirectUrl = $"{finalBaseUrl}{separator}" +
                       $"token={token}" +
                       $"&userId={user.Id}" +
                       $"&username={Uri.EscapeDataString(user.FullName)}" +
                       $"&email={Uri.EscapeDataString(user.Email ?? "")}" + // THÊM DÒNG NÀY
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
    }
}
