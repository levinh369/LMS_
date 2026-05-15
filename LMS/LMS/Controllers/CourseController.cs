using Azure.Core;
using LMS.DTOs.Request;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.Design;
using System.Security.Claims;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CourseController : ControllerBase
    {
        private readonly ICourseService courseService;
        public CourseController(ICourseService courseService)
        {
            this.courseService = courseService;
        }
        [HttpPost]
        
        public async Task<IActionResult> AddAsync([FromForm] CourseRequestDTO dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập để thực hiện chức năng này!" });
            }

            try
            {
                int userId = int.Parse(userIdClaim.Value);
                await courseService.CreateAsync(dto, userId);
                return Ok(new
                {
                    message = "Thêm khóa học thành công!"
                });

            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
           
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAynsc(int id)
        {
            await courseService.DeleteAsync(id);
            return Ok(new
            {
                message = "Xóa khóa học thành công"
            });
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAsync(int id, CourseRequestDTO dto)
        {
            await courseService.UpdateAsync(id, dto);
            return Ok(new
            {
                message = "Cập nhật khóa học thành công"
            });
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCourseAsync(int id)
        {
            var course = await courseService.GetById(id);
            return Ok(course);
        }
        [HttpGet("list-data")]
        [Authorize]
        public async Task<IActionResult> ListData(
      int page = 1,
      int pageSize = 10,
      string keySearch = "",
      DateTime? fromDate = null,
      DateTime? toDate = null,
      int isActive = -1,
      int teacherId = 0, int categoryId = 0) 
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int currentUserId = int.TryParse(userIdClaim, out var id) ? id : 0;
            var currentUserRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
            int filterTeacherId;
            if (currentUserRole == "Admin")
            {
                filterTeacherId = teacherId;
            }
            else
            {
                filterTeacherId = currentUserId;
            }
            var (data, total) = await courseService.GetCourseListAsync(
                page, pageSize, keySearch, fromDate, toDate, isActive, filterTeacherId, categoryId);

            return Ok(new
            {
                success = true,
                total = total,
                data = data
            });
        }
        [HttpGet("public-list")]
        public async Task<IActionResult> GetPublicList(int page = 1, int pageSize = 5, string keySearch = "")
        {
            var (data, total) = await courseService.GetPublicCourse(page, pageSize, keySearch);

            return Ok(new
            {
                success = true,
                data = data,
                total = total
            });
        }
        [HttpGet]
        public async Task<IActionResult> GetAllCousers()
        {
            var courses = await courseService.GetCourseDetail();
            return Ok(new { success = true, data = courses });
        }
        [HttpGet("detail/{id}")]
        public async Task<IActionResult> GetCourseDetail(int id)
        {
            var course = await courseService.GetCourseDetailAsync(id);
            return Ok(new
            {
                success = true,
                data = course
            });
        }
        [HttpGet("filter")]
        public async Task<IActionResult> GetCourses([FromQuery] bool isFree)
        {
            var courses = isFree
                ? await courseService.GetCourseFree()
                : await courseService.GetCoursePremium();

            return Ok(new { success = true, data = courses });
        }
        [HttpGet("course-detail/{id}")]
        public async Task<IActionResult> GetCourseDetailHomeAsync(int id)
        {
            // 1. Lấy ID người dùng nhưng KHÔNG bắt buộc
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            int? userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : null;

            // 2. Gọi Service xử lý (Service sẽ lo việc check xem userId này đã mua khóa học chưa)
            var courseDetail = await courseService.GetCourseDetailHomeAsync(id, userId);

            if (courseDetail == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy khóa học!" });
            }

            return Ok(new { success = true, data = courseDetail });
        }
        [HttpGet("course-learning/{id}")]
        public async Task<IActionResult> GetCourseDetailForLearning(int id)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim.Value);
            var courserDetail = await courseService.GetCourseDetailForLearning(id, userId);
            if (courserDetail == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy khóa học này bác ơi!" });
            }
            return Ok(new { success = true, data = courserDetail });
        }
        [Authorize]
        [HttpGet("my-course")]
        public async Task<IActionResult> GetCoursesForUser()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);

            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim.Value);
            var myCourses = await courseService.GetCoursesForUser(userId);
            if (myCourses == null)
            {
                return Ok(new { success = true, data = new List<object>(), message = "Chưa có khóa học nào!" });
            }
            return Ok(new { success = true, data = myCourses });
        }
        [Authorize]
        [HttpPost("complete-lesson/{lessonId}")]
        public async Task<IActionResult> MarkAsCompleted(int lessonId) 
        { 
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim.Value);

            try
            {
                var result = await courseService.MarkAsCompleted(lessonId, userId);

                return Ok(new
                {
                    success = true,
                    completedCount = result.completedCount,
                    isFinished = result.isFinished,
                    totalCount = result.totalCount
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        [Authorize]
        [HttpPost("update-last-watched")]
        public async Task<IActionResult> UpdateLastWatched([FromBody] UserProgressRequestDTO request)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            int userId = int.Parse(userIdClaim.Value);
            await courseService.UpdateLastWatchedTime(userId, request.LessonId, request.LastTime);

            return Ok(new { success = true });
        }
        [HttpGet("search")]
        public async Task<IActionResult> SearchQuery([FromQuery] string query)
        {
            try
            {
                var results = await courseService.SearchActiveCoursesAsync(query);
                return Ok(results);
            }
            catch (Exception ex)
            {
                // Có thể log lỗi ở đây: _logger.LogError(ex.Message);
                return StatusCode(500, "Đã có lỗi xảy ra phía server.");
            }
        }
        [HttpGet("resume/{courseId}")]
        public async Task<IActionResult> ResumeLesson(int courseId)
        {
            // 1. Lấy UserId từ Claim (đã chuẩn)
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized(new { message = "Bác chưa đăng nhập nhé!" });

            int userId = int.Parse(userIdClaim.Value);

            try
            {
                // 2. Gọi Service để lấy đúng cái ID bài học cần xem tiếp
                // Không cần truyền "query" gì cả, chỉ cần userId và courseId là đủ
                int resumeId = await courseService.GetResumeLessonIdAsync(userId, courseId);

                // 3. Trả về object JSON để JS dễ bóc tách
                return Ok(new
                {
                    success = true,
                    resumeLessonId = resumeId
                });
            }
            catch (Exception ex)
            {
                // Log lỗi ở đây nếu cần: _logger.LogError(ex, "Lỗi khi lấy bài học resume");
                return StatusCode(500, "Đã có lỗi xảy ra phía server khi tìm bài học tiếp theo.");
            }
        }
        [HttpGet("list-deleted")]
        public async Task<IActionResult> GetDeletedList(int page = 1, int pageSize = 10, string? keySearch = "", int categoryId=0)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";

            int userId = int.TryParse(userIdClaim, out var id) ? id : 0;
            int userIdToFilter = (currentUserRole == "Admin") ? 0 : userId;
            try
            {
                var (data, total) = await courseService.GetDeletedCourseListAsync(page, pageSize, keySearch ?? "", categoryId, userIdToFilter);

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
                await courseService.RestoreAsync(id);
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
                await courseService.HardDeleteAsync(id);
                return Ok(new { Success = true, Message = "Đã xóa vĩnh viễn khóa học" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = "Không thể xóa vĩnh viễn khóa học này vì có dữ liệu liên quan." });
            }
        }
        [HttpGet("get-all-teachers")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllTeachers()
        {
            try
            {
                var data = await courseService.GetTeacherListForSelectAsync();
                return Ok(new { success = true, data = data });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        [HttpPut("toggle-status/{id}")]
        public async Task<IActionResult> ToggleStatus(int id, [FromQuery] string role)
        {
            try
            {
                var result = await courseService.ToggleStatusAsync(id, role);

                if (!result)
                {
                    return BadRequest("Thao tác bị chặn: Khóa học đang trong trạng thái niêm phong bởi Quản trị viên.");
                }

                return Ok(new { success = true, message = "Cập nhật trạng thái thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
            }
        }
        [HttpGet("lookup")]
        public async Task<IActionResult> GetLookupByTeacher()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized(new { message = "Bạn chưa đăng nhập nhé!" });

            int teacherId = int.Parse(userIdClaim.Value);
            try
            {
                var courses = await courseService.GetCourseByTeacherAsync(teacherId);
                return Ok(new { success = true, data = courses });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        [HttpGet("by-teacher")] 
        public async Task<IActionResult> GetCoursesByTeacher([FromQuery] string teacherId = "all")
        {
            try
            {
                // Logic xử lý giống như cũ
                if (teacherId == "all" || teacherId == "0")
                {
                    var allCourses = await courseService.GetCourseDetail();
                    return Ok(new { success = true, data = allCourses });
                }

                int id = int.Parse(teacherId);
                var courses = await courseService.GetCourseByTeacherAsync(id);
                return Ok(new { success = true, data = courses });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        [HttpPost("soft-delete-bulk")]
        public async Task<IActionResult> SoftDeleteBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var result = await courseService.SoftDeleteBulkAsync(ids);
            if (result)
                return Ok(new { Success = true, Message = $"Đã chuyển {ids.Count} mục vào thùng rác." });

            return BadRequest(new { Success = false, Message = "Không thể xóa các mục đã chọn." });
        }
        [HttpPost("restore-bulk")]
        public async Task<IActionResult> RestoreBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var result = await courseService.RestoreBulkAsync(ids);
            if (result)
                return Ok(new { Success = true, Message = $"Đã khôi phục {ids.Count} khóa học thành công." });

            return BadRequest(new { Success = false, Message = "Khôi phục thất bại. Vui lòng thử lại." });
        }

        [HttpDelete("hard-delete-bulk")]
        public async Task<IActionResult> HardDeleteBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var result = await courseService.HardDeleteBulkAsync(ids);
            if (result)
                return Ok(new { Success = true, Message = $"Đã xóa vĩnh viễn {ids.Count} khóa học." });

            return BadRequest(new { Success = false, Message = "Không thể xóa vĩnh viễn dữ liệu." });
        }
    

}
}
