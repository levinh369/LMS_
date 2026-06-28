using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Repositories.Interfaces
{
    public interface ILessonRepository : IRepository<LessonModel>
    {
        Task<LessonModel?> GetByTitleAsync(string name);
        Task<LessonModel?> GetById(int id);
        Task<(List<LessonModel> Data, int Total)> GetLessonAsync(int chaptertId, string keySearch,
            bool? isPreview, int isAcitve);
        Task AddRangeAsync(List<LessonModel> lessons);
        Task<(List<CourseLessonSummaryDTO> Data, int Total)> GetCourseSummariesAsync(int page, int pageSize, string keySearch);
        Task<List<LessonModel>> GetByCourseIdAsync(int courseId);
        Task<List<LessonBasicDTO>> GetListLessonBasicAsync(int courseId);
        Task<List<LessonModel>?> GetLessonsByChapterId(int chapterId);
        Task<bool> UpdateLessonsOrderAsync(List<int> lessonIds);
        Task<int> GetMaxOrderIndexByChapterIdAsync(int chapterId);
        Task<int> GetCourseIdByChapterIdAsync(int chapterId);
        Task<LessonModel> GetByIdWithIgnoreFilterAsync(int id);
        Task<List<LessonModel>> GetListByIdsWithIgnoreFilterAsync(List<int> ids);
        Task SoftDeleteAsync(LessonModel entity, string deletedByRole);
        Task RestoreAsync(LessonModel entity);
        Task HardDeleteAsync(LessonModel entity);
        Task<bool> UpdateDeleteStatusBulkAsync(List<int> ids, bool isDeleted, string deletedByRole);
        Task<bool> HardDeleteBulkAsync(List<int> ids);
        string GetBunnyVideoId(int lessonId);
    }
}
