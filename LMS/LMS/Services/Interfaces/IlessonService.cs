using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Services.Interfaces
{
    public interface IlessonService
    {

        Task<IEnumerable<LessonResponseDTO>> GetAllAsync();
        Task<LessonResponseDTO> GetByIdAsync(int id);
        Task UpdateAsync(int id, LessonRequestDTO dto);
        Task DeleteAsync(int id);
        Task<LessonResponseDTO> GetById(int id);
        Task<List<LessonResponseDTO>> GetLessonsByCourseAsync(int courseId);
        Task CreateAsync(LessonRequestDTO dto);
        Task<LessonModel> GetByIdOrThrowAsync(int id);
        Task<(List<LessonResponseDTO> Data, int Total)> GetLessonListAsync(
        int chapterId, string keySearch, bool? isPreview, int isActive);
        Task CreateBulkAsync(List<LessonRequestDTO> dtos);
        Task<(List<CourseLessonSummaryDTO> Data, int Total)> GetCourseListForAdminAsync(int page, int pageSize, string keySearch);
        Task<bool> ReorderLessonsAsync(List<int> lessonIds);
        Task<List<LessonResponseDTO>> GetLessonListAsync(int chapterId);
        string GenerateSecureBunnyUrl(string videoId, string? libraryId);
        Task<int> GetBunnyVideoDurationAsync(string videoId);
        Task<int> GetCourseId(int chapterId);
        Task<List<LessonBasicDTO>> GetListLessonBasicAsync(int courseId);
    }
}
