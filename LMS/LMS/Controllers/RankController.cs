using LMS.DTOs.Request;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Controllers
{
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class RankController : ControllerBase
    {
        private readonly IRankService _rankService;
        public RankController(IRankService rankService) => _rankService = rankService;

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var data = await _rankService.GetDashboardDataAsync();
            return Ok(data);
        }
        [HttpGet("teachers-by-rank")]
        public async Task<IActionResult> GetTeachersByRank([FromQuery] int rank)
        {
            try
            {
                var result = await _rankService.GetTeachersByRankAsync(rank);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        [HttpPut("ranks/{id}")]
        public async Task<IActionResult> UpdateRank(int id, [FromBody] RankRequestDTO rankRequest)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Controller gọi thẳng xuống Repo
            var isSuccess = await _rankService.UpdateRankAsync(id, rankRequest);

            if (!isSuccess)
                return NotFound(new { message = "Không tìm thấy hạng này để cập nhật." });

            return Ok(new { message = "Cập nhật chính sách hạng thành công!" });
        }
    }
}
