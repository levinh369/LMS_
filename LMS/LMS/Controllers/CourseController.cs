using LMS.DTOs.Request;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
            await courseService.CreateAsync(dto);
            return Ok(new
            {
                message = "Thêm khóa học thành công!"
            });
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
        public async Task<IActionResult> ListData(
        int page = 1,
        int pageSize = 10,
        string keySearch = "",
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int isActive = -1)
        {
            var (data, total) = await courseService.GetCourseListAsync(
                page, pageSize, keySearch, fromDate, toDate, isActive);
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
    }
}
