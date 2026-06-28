using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BunnyController : ControllerBase
    {
        private readonly IBunnyService _bunnyService;

        public BunnyController(IBunnyService bunnyService)
        {
            _bunnyService = bunnyService;
        }

        // API xin VideoId đặt chỗ trước
        [HttpPost("init")]
        public async Task<IActionResult> InitVideo([FromBody] BunnyInitRequest request)
        {
            if (string.IsNullOrEmpty(request.Title))
                return BadRequest("Tên video không được để trống");

            try
            {
                var videoId = await _bunnyService.InitVideoAsync(request.Title);
                return Ok(new { videoId });
            }
            catch (Exception ex)
            {
                // Bác có thể tích hợp ILogger để log ex.Message ở đây nếu cần
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
            }
        }

        // API Xóa video rác khi hủy dòng bài học
        [HttpDelete("{videoId}")]
        public async Task<IActionResult> DeleteVideo(string videoId)
        {
            if (string.IsNullOrEmpty(videoId))
                return BadRequest("VideoId không hợp lệ");

            var isDeleted = await _bunnyService.DeleteVideoAsync(videoId);

            if (!isDeleted)
                return StatusCode(500, "Không thể xóa video trên máy chủ Bunny");

            return Ok(new { message = "Đã dọn dẹp video rác thành công!" });
        }
    }
    public class BunnyInitRequest
    {
        public string Title { get; set; }
    }
}
