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
    // 📍 FIX 1: Gỡ bỏ Roles chặn tổng ở đầu Class. Chỉ giữ [Authorize] trơn để mở cổng cho Student đi qua.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CourseController : ControllerBase
    {
        private readonly ICourseService courseService;
        public CourseController(ICourseService courseService)
        {
            this.courseService = courseService;
        }

        // --- NHÓM 1: CÁC API THAO TÁC KHÓA HỌC (ÉP CỨNG CHỈ TEACHER VÀ ADMIN ĐƯỢC VÀO) ---

        [HttpPost]
        [Authorize(Roles = "Teacher,Admin")] // Đưa phân quyền Teacher,Admin xuống đúng hàm cần chặn
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
                return Ok(new { message = "Thêm khóa học thành công!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Teacher,Admin")] // Chỉ Teacher/Admin được quyền xóa khóa học
        public async Task<IActionResult> DeleteAynsc(int id)
        {
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(roleClaim) || string.IsNullOrEmpty(userIdClaim))
            {
                return Unauthorized(new { message = "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn!" });
            }
            int userId = int.Parse(userIdClaim);
            await courseService.DeleteAsync(id, roleClaim, userId);
            return Ok(new { message = "Xóa khóa học thành công" });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Teacher,Admin")] // Chỉ Teacher/Admin được quyền cập nhật
        public async Task<IActionResult> UpdateAsync(int id, CourseRequestDTO dto)
        {
            await courseService.UpdateAsync(id, dto);
            return Ok(new { message = "Cập nhật khóa học thành công" });
        }

        [HttpPost("soft-delete-bulk")]
        [Authorize(Roles = "Teacher,Admin")] // Chặn quyền xóa hàng loạt
        public async Task<IActionResult> SoftDeleteBulk([FromBody] List<int> ids)
        {
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(roleClaim) || string.IsNullOrEmpty(userIdClaim))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ hoặc chưa đăng nhập." });

            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            int userId = int.Parse(userIdClaim);
            try
            {
                var deletedCount = await courseService.SoftDeleteBulkAsync(ids, roleClaim, userId);
                if (deletedCount > 0)
                    return Ok(new { Success = true, Message = $"Đã chuyển {deletedCount} mục hợp lệ vào thùng rác." });
                return BadRequest(new { Success = false, Message = "Không thể xóa! Các mục đã chọn có thể đang bị Admin niêm phong hoặc không thuộc quyền sở hữu của bạn." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Success = false, Message = $"Lỗi hệ thống: {ex.Message}" });
            }
        }

        [HttpPost("restore-bulk")]
        [Authorize(Roles = "Teacher,Admin")] // Chỉ Teacher/Admin được khôi phục hàng loạt
        public async Task<IActionResult> RestoreBulk([FromBody] List<int> ids)
        {
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(roleClaim) || string.IsNullOrEmpty(userIdClaim))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ hoặc chưa đăng nhập." });

            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            int userId = int.Parse(userIdClaim);
            try
            {
                var restoreCount = await courseService.RestoreBulkAsync(ids, roleClaim, userId);
                if (restoreCount > 0)
                    return Ok(new { Success = true, Message = $"Đã khôi phục {restoreCount} mục." });
                return BadRequest(new { Success = false, Message = "Khôi phục thất bại. Vui lòng thử lại." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Success = false, Message = $"Lỗi hệ thống: {ex.Message}" });
            }
        }

        [HttpDelete("hard-delete-bulk")]
        [Authorize(Roles = "Teacher,Admin")] // Chỉ Teacher/Admin được xóa vĩnh viễn hàng loạt
        public async Task<IActionResult> HardDeleteBulk([FromBody] List<int> ids)
        {
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(roleClaim) || string.IsNullOrEmpty(userIdClaim))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ." });

            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            int userId = int.Parse(userIdClaim);
            try
            {
                var deletedCount = await courseService.HardDeleteBulkAsync(ids, roleClaim, userId);
                if (deletedCount > 0)
                    return Ok(new { Success = true, Message = $"Đã xóa vĩnh viễn {deletedCount} mục hợp lệ khỏi hệ thống." });
                return BadRequest(new { Success = false, Message = "Không thể xóa! Dữ liệu có thể đang bị Admin niêm phong hoặc không thuộc quyền sở hữu của bạn." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Success = false, Message = $"Lỗi hệ thống: {ex.Message}" });
            }
        }

        [HttpPost("restore/{id}")]
        [Authorize(Roles = "Teacher,Admin")] // Chỉ Teacher/Admin được khôi phục đơn lẻ
        public async Task<IActionResult> Restore(int id)
        {
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(roleClaim) || string.IsNullOrEmpty(userIdClaim))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ." });

            try
            {
                await courseService.RestoreAsync(id, roleClaim, int.Parse(userIdClaim));
                return Ok(new { Success = true, Message = "Khôi phục khóa học thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        [HttpDelete("hard-delete/{id}")]
        [Authorize(Roles = "Teacher,Admin")] // Chỉ Teacher/Admin được xóa vĩnh viễn đơn lẻ
        public async Task<IActionResult> HardDelete(int id)
        {
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(roleClaim) || string.IsNullOrEmpty(userIdClaim))
                return Unauthorized(new { Success = false, Message = "Phiên làm việc không hợp lệ." });

            try
            {
                await courseService.HardDeleteAsync(id, roleClaim, int.Parse(userIdClaim));
                return Ok(new { Success = true, Message = "Đã xóa vĩnh viễn khóa học." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = $"Lỗi: {ex.Message}" });
            }
        }

        [HttpGet("get-all-teachers")]
        [Authorize(Roles = "Admin")] // Giữ nguyên phân quyền Admin độc quyền lấy danh sách giáo viên
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

        [Authorize(Roles = "Admin,Teacher")] // Chỉ Admin và Teacher xem danh sách quản lý phân trang
        [HttpGet("list-data")]
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

            return Ok(new { success = true, total = total, data = data });
        }

        [Authorize(Roles = "Admin,Teacher")] // Chỉ Admin/Teacher xem danh sách đã xóa trong dashboard
        [HttpGet("list-deleted")]
        public async Task<IActionResult> GetDeletedList(int page = 1, int pageSize = 10, string? keySearch = "", int categoryId = 0)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "";

            int userId = int.TryParse(userIdClaim, out var id) ? id : 0;
            int userIdToFilter = (currentUserRole == "Admin") ? 0 : userId;
            try
            {
                var (data, total) = await courseService.GetDeletedCourseListAsync(page, pageSize, keySearch ?? "", categoryId, userIdToFilter);

                return Ok(new { Success = true, Data = data, Total = total, Page = page, PageSize = pageSize });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        [Authorize(Roles = "Admin,Teacher")] // Phục vụ riêng màn hình quản lý
        [HttpGet("by-teacher")]
        public async Task<IActionResult> GetCoursesByTeacher([FromQuery] string teacherId = "all")
        {
            try
            {
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var currentUserIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(currentUserRole) || string.IsNullOrEmpty(currentUserIdStr))
                {
                    return Unauthorized(new { success = false, message = "Không xác định được danh tính." });
                }

                int currentUserId = int.Parse(currentUserIdStr);

                if (currentUserRole == "Teacher")
                {
                    var myCourses = await courseService.GetCourseByTeacherAsync(currentUserId);
                    return Ok(new { success = true, data = myCourses });
                }

                if (currentUserRole == "Admin")
                {
                    if (teacherId == "all" || teacherId == "0")
                    {
                        var allCourses = await courseService.GetCourseDetail();
                        return Ok(new { success = true, data = allCourses });
                    }
                    else
                    {
                        int id = int.Parse(teacherId);
                        var courses = await courseService.GetCourseByTeacherAsync(id);
                        return Ok(new { success = true, data = courses });
                    }
                }

                return Forbid();
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [Authorize(Roles = "Admin,Teacher")]
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

        [Authorize(Roles = "Teacher")] // Chỉ Giảng viên tra cứu khóa học của mình để gán bài học
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


        // --- NHÓM 2: CÁC API HỌC TẬP & TIẾN ĐỘ (STUDENT VÀ CÁC QUYỀN KHÁC ĐỀU VÀO ĐƯỢC) ---

        [Authorize] // ✅ FIX 2: Chỉ giữ duy nhất Authorize trơn để cho phép Student được học bài bài bản
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

        [Authorize] // ✅ FIX 3: Chỉ giữ duy nhất Authorize trơn
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

        [Authorize] // ✅ FIX 4: Chỉ giữ duy nhất Authorize trơn
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

        [Authorize] // ✅ FIX 5: Chỉ giữ duy nhất Authorize trơn
        [HttpPost("update-last-watched")]
        public async Task<IActionResult> UpdateLastWatched([FromBody] UserProgressRequestDTO request)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            int userId = int.Parse(userIdClaim.Value);
            await courseService.UpdateLastWatchedTime(userId, request.LessonId, request.LastTime);

            return Ok(new { success = true });
        }

        [Authorize] // ✅ FIX 6: Chỉ giữ duy nhất Authorize trơn
        [HttpGet("resume/{courseId}")]
        public async Task<IActionResult> ResumeLesson(int courseId)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized(new { message = "Bác chưa đăng nhập nhé!" });

            int userId = int.Parse(userIdClaim.Value);
            try
            {
                int resumeId = await courseService.GetResumeLessonIdAsync(userId, courseId);
                return Ok(new { success = true, resumeLessonId = resumeId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Đã có lỗi xảy ra phía server khi tìm bài học tiếp theo.");
            }
        }


        // --- NHÓM 3: CÁC API CÔNG KHAI KHÔNG CẦN ĐĂNG NHẬP (CHỈ DÙNG ALLOWANONYMOUS) ---

        [AllowAnonymous] // ✅ FIX 7: Xóa bỏ [Authorize] bị thừa
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCourseAsync(int id)
        {
            var course = await courseService.GetById(id);
            return Ok(course);
        }

        [AllowAnonymous]
        [HttpGet("public-list")]
        public async Task<IActionResult> GetPublicList(int page = 1, int pageSize = 5, string keySearch = "")
        {
            var (data, total) = await courseService.GetPublicCourse(page, pageSize, keySearch);
            return Ok(new { success = true, data = data, total = total });
        }

        [AllowAnonymous]
        [HttpGet("all-courses")] // Đổi nhẹ route để phân biệt rõ ràng với hàm GetCourseAsync theo Id
        public async Task<IActionResult> GetAllCousers()
        {
            var courses = await courseService.GetCourseDetail();
            return Ok(new { success = true, data = courses });
        }

        [AllowAnonymous]
        [HttpGet("detail/{id}")]
        public async Task<IActionResult> GetCourseDetail(int id)
        {
            var course = await courseService.GetCourseDetailAsync(id);
            return Ok(new { success = true, data = course });
        }

        [AllowAnonymous]
        [HttpGet("filter")]
        public async Task<IActionResult> GetCourses([FromQuery] bool isFree)
        {
            var courses = isFree
                ? await courseService.GetCourseFree()
                : await courseService.GetCoursePremium();
            return Ok(new { success = true, data = courses });
        }

        [AllowAnonymous]
        [HttpGet("course-detail/{id}")]
        public async Task<IActionResult> GetCourseDetailHomeAsync(int id)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            int? userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : null;

            var courseDetail = await courseService.GetCourseDetailHomeAsync(id, userId);
            if (courseDetail == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy khóa học!" });
            }
            return Ok(new { success = true, data = courseDetail });
        }

        [AllowAnonymous]
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
                return StatusCode(500, "Đã có lỗi xảy ra phía server.");
            }
        }

        [AllowAnonymous]
        [HttpGet("search-result")]
        public async Task<IActionResult> Search([FromQuery] CourseSearchRequestDTO filter)
        {
            try
            {
                if (filter == null) filter = new CourseSearchRequestDTO();
                if (filter.PageIndex < 1) filter.PageIndex = 1;
                if (filter.PageSize < 1) filter.PageSize = 6;

                var result = await courseService.SearchCoursesAsync(filter);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Full Search Error]: {ex.Message}");
                return StatusCode(500, new { success = false, message = "Lỗi xử lý hệ thống: " + ex.Message });
            }
        }
    }
}