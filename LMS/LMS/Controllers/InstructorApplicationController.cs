using Azure.Core;
using LMS.DTOs.Request;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LMS.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class InstructorApplicationController : ControllerBase
    {
        private readonly IInstructorApplicationService _instructorService;

        public InstructorApplicationController(IInstructorApplicationService instructorService)
        {
            _instructorService = instructorService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")] 
        public async Task<IActionResult> GetApplications(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? keySearch = "",
            [FromQuery] string status = "Pending",
            [FromQuery] string sort = "newest")
        {
            try
            {
                var (data, total) = await _instructorService.GetPagedAsync(page, pageSize, keySearch, status, sort);

                return Ok(new
                {
                    success = true,
                    data = data,
                    totalRecords = total,
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Lỗi khi lấy danh sách hồ sơ: " + ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")] 
        public async Task<IActionResult> DeleteAynsc(int id)
        {
            await _instructorService.DeleteAsync(id);
            return Ok(new
            {
                message = "Xóa đơn ứng tuyển thành công"
            });
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")] 
        public async Task<IActionResult> GetAppAsync(int id)
        {
            var app = await _instructorService.DetailApplicationAsync(id);
            return Ok(app);
        }

        [HttpGet("pending")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingApplications()
        {
            try
            {
                var applications = await _instructorService.GetPendingApplicationsAsync();
                return Ok(applications);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/approve")]
        [Authorize(Roles = "Admin")] 
        public async Task<IActionResult> Approve(int id)
        {
            try
            {
                var result = await _instructorService.ApproveApplicationAsync(id);
                if (!result) return BadRequest(new { message = "Duyệt thất bại hoặc đơn không tồn tại." });

                return Ok(new { message = "Đã phê duyệt. Người dùng này đã trở thành Giảng viên." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/reject")]
        [Authorize(Roles = "Admin")] 
        public async Task<IActionResult> Reject(int id, [FromBody] RejectApplicationRequestDTO dto)
        {
            try
            {
                var result = await _instructorService.RejectApplicationAsync(id, dto.Reason);
                if (!result) return BadRequest(new { message = "Từ chối thất bại hoặc đơn không tồn tại." });

                return Ok(new { message = "Đã từ chối đơn đăng ký." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


      

        [HttpPost("apply")]
        [Authorize] 
        public async Task<IActionResult> Apply([FromForm] ApplyInstructorRequestDTO dto)
        {
            try
            {
                var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var userName = User.FindFirstValue(ClaimTypes.Name) ?? "Người dùng";
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized(new { message = "Không xác định được phiên đăng nhập." });
                }

                int userId = int.Parse(userIdClaim);

                await _instructorService.ApplyInstructorAsync(userId, userName, dto);

                return Ok(new { message = "Nộp hồ sơ thành công! Vui lòng chờ quản trị viên phê duyệt." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}