using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashBoardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;
        public DashBoardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics(DateTime? fromDate, DateTime? toDate)
        {
            var start = fromDate ?? DateTime.Now.AddDays(-30); 
            var end = toDate ?? DateTime.Now;

            var result = await _dashboardService.GetAdminDashboardData(start, end);
            return Ok(result);
        }
        [HttpGet("dashboard-data")]
        public async Task<IActionResult> GetDashboardData([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {

            var teacherIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(teacherIdStr) || !int.TryParse(teacherIdStr, out int teacherId))
            {
                return Unauthorized(new { message = "Phiên làm việc hết hạn hoặc không tìm thấy thông tin giảng viên!" });
            }

            try
            {
                // 2. GỌI TẦNG SERVICE ĐỂ TÍNH TOÁN DỮ LIỆU
                var dashboardData = await _dashboardService.GetDashboardDataAsync(teacherId, startDate, endDate);
                return Ok(dashboardData);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Đã xảy ra lỗi trong quá trình xử lý dữ liệu báo cáo thống kê!",
                    error = ex.Message
                });
            }
        }
    }
}
