using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Repositories;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null) return Unauthorized(new { message = "Hết phiên đăng nhập!" });

                int userId = int.Parse(userIdClaim.Value);
                var result = await userService.UpdateProfile(userId, model);

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật hồ sơ thành công!",
                    newName = result.FullName,
                    newAvatar = result.AvatarUrl
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        [HttpGet("list-data")]
        public async Task<IActionResult> ListData(
        int page = 1,
        int pageSize = 10,
        string keySearch = "",
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int courseId = 0,
        int roleId = 0,
        int isActive = -1)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int currentUserId = int.TryParse(userIdClaim, out var id) ? id : 0;
            var currentUserRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
            if (currentUserRole == "Admin")
            {
                currentUserId = 0;
            }
            var (data, total) = await userService.GetUserListAsync(
                page, pageSize, keySearch, fromDate, toDate, isActive, currentUserId, roleId, courseId);
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
        [HttpGet("list-deleted")]
        public async Task<IActionResult> GetDeletedList(int page = 1, int pageSize = 10, string? keySearch = "", int roleId = 0)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";

            int userId = int.TryParse(userIdClaim, out var id) ? id : 0;
            int userIdToFilter = (currentUserRole == "Admin") ? 0 : userId;
            try
            {
                var (data, total) = await userService.GetDeletedUserListAsync(page, pageSize, keySearch ?? "", roleId, userIdToFilter);

                return Ok(new
                {
                    Success = true,
                    Data = data,
                    Total = total,
                    Page = page,
                    PageSize = pageSize
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        [HttpPost("restore/{id}")]
        public async Task<IActionResult> Restore(int id)
        {
            try
            {
                await userService.RestoreAsync(id);
                return Ok(new { Success = true, Message = "Khôi phục khóa học thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        [HttpDelete("hard-delete/{id}")]
        public async Task<IActionResult> HardDelete(int id)
        {
            try
            {
                await userService.HardDeleteAsync(id);
                return Ok(new { Success = true, Message = "Đã xóa vĩnh viễn khóa học" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = "Không thể xóa vĩnh viễn khóa học này vì có dữ liệu liên quan." });
            }
        }
        [HttpPost("soft-delete-bulk")]
        public async Task<IActionResult> SoftDeleteBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var result = await userService.SoftDeleteBulkAsync(ids);
            if (result)
                return Ok(new { Success = true, Message = $"Đã chuyển {ids.Count} mục vào thùng rác." });

            return BadRequest(new { Success = false, Message = "Không thể xóa các mục đã chọn." });
        }
        [HttpPost("restore-bulk")]
        public async Task<IActionResult> RestoreBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var result = await userService.RestoreBulkAsync(ids);
            if (result)
                return Ok(new { Success = true, Message = $"Đã khôi phục {ids.Count} tài khoản thành công." });

            return BadRequest(new { Success = false, Message = "Khôi phục thất bại. Vui lòng thử lại." });
        }

        [HttpDelete("hard-delete-bulk")]
        public async Task<IActionResult> HardDeleteBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var result = await userService.HardDeleteBulkAsync(ids);
            if (result)
                return Ok(new { Success = true, Message = $"Đã xóa vĩnh viễn {ids.Count} tài khoản." });

            return BadRequest(new { Success = false, Message = "Không thể xóa vĩnh viễn dữ liệu." });
        }
    }
}
