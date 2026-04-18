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
        Task DeleteAsync(int id);
        Task<CourseResponeDTO> GetById(int id);   
        Task CreateAsync(CourseRequestDTO dto);
        Task<CourseModel> GetByIdOrThrowAsync(int id);
        Task<(List<CourseResponeDTO> Data, int Total)> GetCourseListAsync(
        int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive);
        Task<(List<CourseHomeDTO> Data, int Total)> GetPublicCourse(
        int page, int pageSize, string keySearch);
        Task<CourseDetailDTO> GetCourseDetailAsync(int id);
        Task<List<CourseHomeDTO>> GetCourseFree();
        Task<List<CourseHomeDTO>> GetCoursePremium();
        Task<CourseResponeDTO> GetCourseDetailHomeAsync(int id, int? userId = null);
        Task<CourseResponeDTO?> GetCourseDetailForLearning(int courseId, int? userId = null);
        Task<List<CourseResponeDTO>> GetCoursesForUser(int userId);
        Task<(int completedCount, int totalCount, bool isFinished )> MarkAsCompleted(int lessonId, int userId);
        Task UpdateLastWatchedTime(int userId, int lessonId, int time);
        Task<List<CourseSearchDTO>> SearchActiveCoursesAsync(string query);
        Task<int> GetResumeLessonIdAsync(int userId, int courseId);
    }
}
