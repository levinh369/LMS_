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
    [Authorize(Roles = "Admin, Teacher")]
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

        [HttpDelete("{id:int}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ!" });

            try
            {
                int userId = int.Parse(userIdStr);
                await lessonService.DeleteAsync(id, role, userId);
                return Ok(new { Success = true, Message = "Xóa bài học thành công!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
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
        [AllowAnonymous]
        [HttpGet("get-duration/{videoId}")]
        public async Task<IActionResult> GetDuration(string videoId)
        {
            var duration = await youtubeService.GetVideoDurationAsync(videoId);
            return Ok(new { seconds = duration });
        }
        [AllowAnonymous]
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
        [AllowAnonymous]
        [HttpGet("list-lesson/{courseId}")]
        public async Task<IActionResult> GetLessonsByCourse(int courseId)
        {
            if (courseId <= 0) return BadRequest(new { success = false, message = "ID khóa học không hợp lệ!" });

            var data = await lessonService.GetListLessonBasicAsync(courseId);

            return Ok(new
            {
                success = true,
                data = data,
            });
        }
        [HttpGet("list-deleted")]
        public async Task<IActionResult> GetDeletedList(int chapterId = 0,int page = 1, int pageSize = 10, string? keySearch = "", bool? isPreview = null)
        {
            try
            {
                var (data, total) = await lessonService.GetDeletedLessonListAsync(chapterId,page, pageSize, keySearch ?? "", isPreview);

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
        [Authorize]
        public async Task<IActionResult> Restore(int id)
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ!" });

            try
            {
                int userId = int.Parse(userIdStr);
                await lessonService.RestoreAsync(id, role, userId);
                return Ok(new { Success = true, Message = "Khôi phục bài học thành công!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        [HttpDelete("hard-delete/{id}")]
        [Authorize]
        public async Task<IActionResult> HardDelete(int id)
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ!" });

            try
            {
                int userId = int.Parse(userIdStr);
                await lessonService.HardDeleteAsync(id, role, userId);
                return Ok(new { Success = true, Message = "Đã xóa vĩnh viễn bài học!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message }); // Sửa lại để ném lỗi thực tế từ Service lên
            }
        }

        [HttpPost("soft-delete-bulk")]
        [Authorize]
        public async Task<IActionResult> SoftDeleteBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ!" });

            try
            {
                int userId = int.Parse(userIdStr);
                var result = await lessonService.SoftDeleteBulkAsync(ids, role, userId);

                if (result)
                    return Ok(new { Success = true, Message = $"Đã chuyển {ids.Count} mục vào thùng rác." });

                return BadRequest(new { Success = false, Message = "Không thể xóa các mục đã chọn." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        [HttpPost("restore-bulk")]
        [Authorize]
        public async Task<IActionResult> RestoreBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ!" });

            try
            {
                int userId = int.Parse(userIdStr);
                var result = await lessonService.RestoreBulkAsync(ids, role, userId);

                if (result)
                    return Ok(new { Success = true, Message = $"Đã khôi phục {ids.Count} bài học thành công." });

                return BadRequest(new { Success = false, Message = "Khôi phục thất bại. Vui lòng thử lại." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        [HttpDelete("hard-delete-bulk")]
        [Authorize]
        public async Task<IActionResult> HardDeleteBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ!" });

            try
            {
                int userId = int.Parse(userIdStr);
                var result = await lessonService.HardDeleteBulkAsync(ids, role, userId);

                if (result)
                    return Ok(new { Success = true, Message = $"Đã xóa vĩnh viễn {ids.Count} bài học." });

                return BadRequest(new { Success = false, Message = "Không thể xóa vĩnh viễn dữ liệu." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }
        [HttpPost("change-status/{id}")]
        [Authorize]
        public async Task<IActionResult> ChangeStatus(int id)
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(userIdStr))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ!" });

            try
            {
                int userId = int.Parse(userIdStr);
                bool newStatus = await lessonService.ChangeStatusAsync(id, role, userId);

                string statusText = newStatus ? "Hoạt động" : "Tạm ẩn";

                return Ok(new
                {
                    Success = true,
                    Message = $"Đã chuyển trạng thái bài học thành: {statusText}"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }
    }
}
