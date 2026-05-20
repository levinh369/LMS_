using LMS.DTOs.Request;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WithdrawalController : ControllerBase
    {
        private readonly IWithdrawalService _withdrawalService;

        public WithdrawalController(IWithdrawalService withdrawalService)
        {
            _withdrawalService = withdrawalService;
        }


        [Authorize(Roles = "Teacher")] 
        [HttpPost("request")]
        public async Task<IActionResult> CreateWithdrawalRequest([FromBody] WithdrawRequestDTO requestDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });

            // Lấy ID của Teacher từ Token JWT
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });

            int teacherId = int.Parse(userIdClaim);

            var result = await _withdrawalService.CreateWithdrawalRequestAsync(teacherId, requestDto);

            if (result.IsSuccess)
                return Ok(new { success = true, message = result.Message });

            return BadRequest(new { success = false, message = result.Message });
        }

        [Authorize(Roles = "Teacher")]
        [HttpGet("history")]
        public async Task<IActionResult> GetTeacherHistory([FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 10)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });

            int teacherId = int.Parse(userIdClaim);

            var result = await _withdrawalService.GetTeacherHistoryAsync(teacherId, pageIndex, pageSize);

            return Ok(new
            {
                success = true,
                data = result.Data,
                total = result.Total
            });
        }
        [Authorize(Roles = "Admin")]
        [HttpGet("admin/teacher-history/{teacherId}")]
        public async Task<IActionResult> GetTeacherHistoryForAdmin(
            int teacherId,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 5)
        {
            var result = await _withdrawalService.GetTeacherHistoryAsync(teacherId, pageIndex, pageSize);

            return Ok(new
            {
                success = true,
                data = result.Data,
                total = result.Total
            });
        }

        [Authorize(Roles = "Admin")] // Bắt buộc phải là Admin
        [HttpGet("admin/list")]
        public async Task<IActionResult> GetAdminWithdrawals(
            [FromQuery] string? keyword,
            [FromQuery] int status = -1,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _withdrawalService.GetAdminWithdrawalsAsync(keyword, status, fromDate, toDate, pageIndex, pageSize);

            return Ok(new
            {
                success = true,
                data = result.Data,
                total = result.Total
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("admin/process")]
        public async Task<IActionResult> ProcessWithdrawal([FromBody] ProcessWithdrawalDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });
            var adminIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(adminIdClaim))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });

            int adminId = int.Parse(adminIdClaim);

            var result = await _withdrawalService.ProcessWithdrawalAsync(adminId, dto);

            if (result.IsSuccess)
                return Ok(new { success = true, message = result.Message });

            return BadRequest(new { success = false, message = result.Message });
        }
        [Authorize(Roles = "Teacher")]
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            // Bóc ID từ Token
            var teacherIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            // Kiểm tra Token rỗng hoặc không ép kiểu sang số nguyên (int) được
            if (string.IsNullOrEmpty(teacherIdClaim) || !int.TryParse(teacherIdClaim, out int teacherId))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." });

            // Lúc này biến teacherId đã có dữ liệu chuẩn, ném xuống Service thôi
            var result = await _withdrawalService.GetTeacherWalletStatsAsync(teacherId);
            return Ok(new { success = true, data = result });
        }

        [Authorize(Roles = "Teacher")]
        [HttpGet("history-teacher")]
        public async Task<IActionResult> GetHistory([FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 10, [FromQuery] int status = -1)
        {
            // Bóc ID từ Token
            var teacherIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(teacherIdClaim) || !int.TryParse(teacherIdClaim, out int teacherId))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." });

            var result = await _withdrawalService.GetTeacherHistoryAsync(teacherId, pageIndex, pageSize, status);

            return Ok(new
            {
                success = true,
                data = result.Data,
                total = result.Total
            });
        }
    }
}
