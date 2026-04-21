using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
    }
}
