using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Repositories;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService userService;
        public UserController(IUserService uservice)
        {
            this.userService = uservice;
        }
        [Authorize]
        [HttpGet("my-profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim.Value);
            var profileData = await userService.GetFullProfileDataAsync(userId);

            if (profileData == null) return NotFound(new { message = "Không tìm thấy thông tin người dùng" });

            return Ok(profileData);
        }
        [Authorize]
        [HttpGet("settings-data")] 
        public async Task<IActionResult> GetUserSettings()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
            {
                return Unauthorized(new { message = "Vui lòng đăng nhập!" });
            }

            int userId = int.Parse(userIdClaim.Value);

            var result = await userService.GetUserSettingsAsync(userId);

            if (result == null)
            {
                return NotFound(new { message = "Thông tin không tồn tại!" });
            }
            return Ok(result);
        }
        [Authorize]
        [HttpPost("update-profile")]
        public async Task<IActionResult> UpdateProfile([FromForm] UpdateProfileRequestDTO model)
        {
            // 1. Lấy UserId từ Token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized(new { message = "Vui lòng đăng nhập lại bác ơi!" });
            }

            int userId = int.Parse(userIdClaim.Value);

            var result = await userService.UpdateProfile(userId, model);
            if (result == null)
            {
                return BadRequest(new { message = "Mật khẩu hiện tại không đúng hoặc có lỗi xảy ra!" });
            }
            return Ok(new
            {
                success = true,
                message = "Cập nhật hồ sơ thành công!",
                newName = result.FullName,  
                newAvatar = result.AvatarUrl 
            });

        }
        [HttpGet("list-data")]
        public async Task<IActionResult> ListData(
        int page = 1,
        int pageSize = 10,
        string keySearch = "",
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int isActive = -1)
        {
            var (data, total) = await userService.GetUserListAsync(
                page, pageSize, keySearch, fromDate, toDate, isActive);
            return Ok(new
            {
                success = true,
                total = total,
                data = data
            });
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAsync(int id) 
        {
            await userService.DeleteAsync(id);
            return Ok(new
            {
                success = true, // Thêm flag success để Frontend dễ check
                message = "Xóa người dùng thành công"
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAsync(int id, [FromBody] UserRequestDTO dto) 
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            await userService.UpdateAsync(id, dto);
            return Ok(new
            {
                success = true,
                message = "Cập nhật thông tin thành công"
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserAsync(int id) 
        {
            var user = await userService.GetByIdAsync(id);
            return Ok(new
            {
                success = true,
                data = user 
            });
        }
        [HttpPatch("toggle-status/{id}")]
        public async Task<IActionResult> ToggleStatus(int id)
        {
            try
            {
                var newStatus = await userService.ToggleStatusAsync(id);

                return Ok(new
                {
                    success = true,
                    message = newStatus ? "Đã kích hoạt tài khoản" : "Đã khóa tài khoản",
                    data = newStatus
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        [HttpPost]
        public async Task<IActionResult> AddAsync([FromBody] UserRequestDTO dto)
        {
            await userService.CreateAsync(dto);
            return Ok(new
            {
                success = true,
                message = "Thêm tài khoản thành công!"
            });
        }
        [HttpGet("my-orders")]
        public async Task<IActionResult> GetMyOrders()
        {
            // Lấy UserId từ Claim (Token)
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            int userId = int.Parse(userIdClaim.Value);
            var orders = await userService.GetOrdersList(userId);

            return Ok(new { data = orders });
        }
    }
}
