using LMS.DTOs.Request;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LessonController : ControllerBase
    {
        private readonly IlessonService lessonService;
        private readonly IYoutubeService youtubeService;

        public LessonController(IlessonService lessonService, IYoutubeService youtubeService)
        {
            this.lessonService = lessonService;
            this.youtubeService = youtubeService;
        }

        // 1. Lấy danh sách bài học theo ID khóa học (Dùng cho trang quản lý)
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetByCourse(int courseId)
        {
            var data = await lessonService.GetByIdAsync(courseId);
            return Ok(data);
        }
        [HttpGet("by-course/{courseId}")]
        public async Task<IActionResult> GetByCourses(int courseId)
        {
            var data = await lessonService.GetLessonsByCourseAsync(courseId);

            if (data == null || data.Count == 0)
            {
                return Ok(new { success = true, data = new List<object>(), message = "Khóa học này chưa có bài giảng." });
            }

            return Ok(new { success = true, data });
        }

        // 2. Lấy chi tiết 1 bài học
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var data = await lessonService.GetByIdAsync(id);
            if (data == null) return NotFound(new { message = "Không tìm thấy bài học" });
            return Ok(data);
        }

        // 3. Thêm mới bài học (Dùng FromForm để khớp với FormData của JS)
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] LessonRequestDTO dto)
        {
            await lessonService.CreateAsync(dto);
            return Ok(new { message = "Thêm bài học thành công!" });
        }

        // 4. Cập nhật bài học
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromForm] LessonRequestDTO dto)
        {
            await lessonService.UpdateAsync(id, dto);
            return Ok(new { message = "Cập nhật bài học thành công!" });
        }

        // 5. Xóa bài học
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            await lessonService.DeleteAsync(id);
            return Ok(new { message = "Xóa bài học thành công!" });
        }
        [HttpGet("list-data")]
        public async Task<IActionResult> ListData(
       int chapterId = 0,
       string keySearch = "",
       bool? isPreview = null,
       int isActive = -1)
        {
            var (data, total) = await lessonService.GetLessonListAsync(
                chapterId, keySearch, isPreview, isActive);
            var courseId = await lessonService.GetCourseId(chapterId);
            return Ok(new
            {
                success = true,
                total = total,
                data = data,
                courseId = courseId
            });
        }
        [HttpPost("bulk")]
        public async Task<IActionResult> CreateBulk([FromBody] List<LessonRequestDTO> dtos)
        {
            if (dtos == null || !dtos.Any()) return BadRequest("Dữ liệu trống!");

            await lessonService.CreateBulkAsync(dtos);
            return Ok(new { message = "Lưu thành công!" });
        }
        [HttpGet("get-duration/{videoId}")]
        public async Task<IActionResult> GetDuration(string videoId)
        {
            var duration = await youtubeService.GetVideoDurationAsync(videoId);
            return Ok(new { seconds = duration });
        }
        [HttpGet("get-duration-bunny/{videoId}")]
        public async Task<IActionResult> GetDurationBuuny(string videoId)
        {
            var duration = await lessonService.GetBunnyVideoDurationAsync(videoId);
            return Ok(new { seconds = duration });
        }
        [HttpGet("list")]
        public async Task<IActionResult> GetList(int page = 1, int pageSize = 10, string keySearch = "")
        {
            // Bóc tách tuple (danh sách và tổng số) ngay tại đây
            var (list, total) = await lessonService.GetCourseListForAdminAsync(page, pageSize, keySearch);

            // Trả về JSON có tên thuộc tính rõ ràng: data và total
            return Ok(new
            {
                success = true,
                data = list,
                total = total
            });
        }
        [HttpPost("update-order")]
        public async Task<IActionResult> UpdateOrder([FromBody] List<int> ids)
        {
            var isSuccess = await lessonService.ReorderLessonsAsync(ids);

            if (isSuccess)
                return Ok(new { message = "Thứ tự mới đã được ghi nhận!" });

            return BadRequest("Không cập nhật được thứ tự bài học bác ơi.");
        }
        [HttpGet("chapterId/{chapterId}")]
        public async Task<IActionResult> GetLessonByChapterId(int chapterId)
        {
            var lessons = await lessonService.GetLessonListAsync(chapterId);
            if (lessons == null) return NotFound("Bài học không tồn tại!");
            return Ok(new
            {
                success = true,
                data = lessons
            });
        }
    }
}
