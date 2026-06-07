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
        [HttpGet("{id}")]
        // [Authorize] 
        public async Task<IActionResult> GetWithdrawalDetail(int id)
        {
            var result = await _withdrawalService.GetWithdrawalDetail(id);
            if (result == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy giao dịch rút tiền này." });
            }

            // Trả về DTO đã được Service map sẵn cho Frontend
            return Ok(new { success = true, data = result });
        }
        [HttpGet("admin/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetDetailForAdmin(int id)
        {
            // Gọi tầng Service xử lý
            var result = await _withdrawalService.GetWithdrawalDetailForAdmin(id);

            // Rẽ nhánh kết quả dựa trên xử lý của Service
            if (result == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy chi tiết yêu cầu rút tiền này." });
            }

            // Trả về định dạng Object chuẩn kèm theo DTO
            return Ok(new { success = true, data = result });
        }
        [Authorize(Roles = "Teacher")] 
        [HttpPost("{id}/dispute")]    
        public async Task<IActionResult> DisputeWithdrawal(int id, [FromBody] DisputeRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                return BadRequest(new { success = false, message = "Bác phải nhập lý do khiếu nại chứ!" });
            }
            var result = await _withdrawalService.DisputeWithdrawal(id, request.Reason);
            if (result.IsSuccess)
            {
                return Ok(new { success = true, message = result.Message });
            }

            return BadRequest(new { success = false, message = result.Message });
        }
        [Authorize(Roles = "Admin")] // Chỉ Admin mới có quyền bấm nút này
        [HttpPost("admin/{id}/rollback")]
        public async Task<IActionResult> RollbackFriendly(int id, [FromBody] RollbackRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.AdminNote))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập lý do hoàn tiền để lưu lịch sử." });
            }

            try
            {
                int adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
                var result = await _withdrawalService.RollbackWithdrawalAsync(id, adminId, request.AdminNote);
                if (result.IsSuccess)
                {
                    return Ok(new { success = true, message = result.Message });
                }

                return BadRequest(new { success = false, message = result.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi server: " + ex.Message });
            }
        }
        [HttpGet("export-excel")]
        public async Task<IActionResult> ExportWithdrawalExcel(
    string keyword = "", int status = -1, DateTime? fromDate = null, DateTime? toDate = null)
        {
            try
            {
                // 1. 📍 FIX: Truyền đầy đủ keyword, status, fromDate, toDate vào Service
                var data = await _withdrawalService.GetAllWithdrawalsForExportAsync(keyword, status, fromDate, toDate);

                // 2. Gọi hàm xuất mảng byte Excel (Bỏ chữ Async theo đúng hàm đồng bộ mình vừa sửa)
                var fileBytes = _withdrawalService.ExportWithdrawalsToExcel(data);

                // 3. Trả file về trình duyệt
                string fileName = $"Danh_Sach_Rut_Tien_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Lỗi xuất file: " + ex.Message });
            }
        }
    }
}
