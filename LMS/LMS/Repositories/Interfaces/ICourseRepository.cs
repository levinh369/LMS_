using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Repositories.Interfaces
{
    public interface ICourseRepository : IRepository<CourseModel>
    {
        Task<CourseModel?> GetByTitleAsync(string name);
        Task<CourseModel?> GetById(int id);
        Task<CourseModel?> GetCourseAndLessons(int id);
        Task<(List<CourseModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch,
            DateTime? fromDate, DateTime? toDate, int isAcitve, int teacherId, int categoryId);
        Task<(List<CourseModel> Data, int Total)> GetPublicCourse(int page, int pageSize, string keySearch);
        Task<List<CourseModel>> GetCourseFree();
        Task<List<CourseModel>> GetCoursePremium();
        Task<CourseModel?> GetCourseDetail(int id);
        Task<CourseModel?> GetCourseDetailForLearning(int courseId, int? userId);
        Task<List<CourseModel>> GetCourseForUser(int userId);
        Task<List<CourseModel>> GetAvailableCoursesAsync(List<int> excludedIds);
        Task<List<CourseSearchDTO>> GetByQueryList(string query, int limit);
        Task<List<UserModel>> GetAllTeachersAsync();
        Task<bool> ToggleStatusAsync(int id, string role);
        Task<List<CourseLookupDTO>> GetCourseByTeacherAsync(int teacherId);
        Task<CourseModel?> GetByLessonId(int lessonId);
        Task<int> UpdateDeleteStatusBulkAsync(List<int> ids, bool isDeleted, string role, int userId);
        Task<int> HardDeleteBulkAsync(List<int> ids, string role, int userId);
        Task<(List<CourseModel> Data, int Total)> GetPublicCoursesAsync(CourseSearchRequestDTO filter);
    }

}
