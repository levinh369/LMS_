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
            var token = authService.GenerateJwtToken(user);

            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            // --- LOGIC ĐIỀU HƯỚNG LINH HOẠT ---
            // Nếu returnUrl gửi lên từ JS là localhost, nó sẽ dùng cái đó. 
            // Nếu không có hoặc lỗi, nó dùng defaultVercelUrl.
            var finalBaseUrl = string.IsNullOrEmpty(returnUrl) ? defaultVercelUrl : returnUrl;

            string separator = finalBaseUrl.Contains("?") ? "&" : "?";

            var finalRedirectUrl = $"{finalBaseUrl}{separator}" +
                       $"token={token}" +
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
    }
}
