using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Services.Interfaces
{
    public interface IChapterService
    {
        Task<IEnumerable<ChapterResponseDTO>> GetAllAsync();
        Task<ChapterResponseDTO> GetByIdAsync(int id);
        Task<List<ChapterResponseDTO>> GetByCourseAsync(int courseId);
        Task<string> UpdateAsync(int id, ChapterRequestDTO dto);
        Task<string> ChangeStatusAsync(int chapter);
        Task DeleteAsync(int id);
        Task CreateAsync(ChapterRequestDTO dto);
        Task<ChapterModel> GetByIdOrThrowAsync(int id);
        Task<(List<ChapterResponseDTO> Data, int Total)> GetChaperListAsync(
        int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive);
        Task<bool> ReorderChaptersAsync(int courseId, List<int> chapterId);

        
    }
}
