using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;

namespace LMS.Services.Interfaces
{
    public interface ICourseService
    {
        Task<IEnumerable<CourseResponeDTO>> GetCourseDetail();
        Task<CourseResponeDTO> GetByIdAsync(int id);
        Task UpdateAsync(int id, CourseRequestDTO dto);
        Task DeleteAsync(int id, string role, int userId);
        Task<CourseResponeDTO> GetById(int id);
        Task CreateAsync(CourseRequestDTO dto, int userId);
        Task<CourseModel> GetByIdOrThrowAsync(int id);
        Task<(List<CourseResponeDTO> Data, int Total)> GetCourseListAsync(
        int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive, int teacherId, int categoryId);
        Task<(List<CourseHomeDTO> Data, int Total)> GetPublicCourse(
        int page, int pageSize, string keySearch);
        Task<CourseDetailDTO> GetCourseDetailAsync(int id);
        Task<List<CourseHomeDTO>> GetCourseFree();
        Task<List<CourseHomeDTO>> GetCoursePremium();
        Task<CourseResponeDTO> GetCourseDetailHomeAsync(int id, int? userId = null);
        Task<CourseResponeDTO?> GetCourseDetailForLearning(int courseId, int? userId = null);
        Task<List<CourseResponeDTO>> GetCoursesForUser(int userId);
        Task<(int completedCount, int totalCount, bool isFinished)> MarkAsCompleted(int lessonId, int userId);
        Task UpdateLastWatchedTime(int userId, int lessonId, int time);
        Task<List<CourseSearchDTO>> SearchActiveCoursesAsync(string query);
        Task<int> GetResumeLessonIdAsync(int userId, int courseId);
        Task RestoreAsync(int id, string role, int userId);
        Task HardDeleteAsync(int id, string role, int userId);

        Task<(List<CourseResponeDTO> Data, int Total)> GetDeletedCourseListAsync(
            int page, int pageSize, string keySearch, int categoryId, int currentUserId);
        Task<List<UserSimpleDTO>> GetTeacherListForSelectAsync();
        Task<bool> ToggleStatusAsync(int id, string role);
        Task<List<CourseLookupDTO>> GetCourseByTeacherAsync(int teacherId);
        Task<int> RestoreBulkAsync(List<int> ids, string role, int userId);
        Task<int> SoftDeleteBulkAsync(List<int> ids, string role, int userId);
        Task<int> HardDeleteBulkAsync(List<int> ids, string role, int userId);
        Task<PagedResultDto<CourseSearchResultItemDto>> SearchCoursesAsync(CourseSearchRequestDTO filter);
    }
}
