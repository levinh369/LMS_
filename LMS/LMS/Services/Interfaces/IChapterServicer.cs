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
        Task ChangeStatusAsync(int chapterId, string role, int userId);
        Task DeleteAsync(int id, string role, int userId);
        Task CreateAsync(ChapterRequestDTO dto);
        Task<ChapterModel> GetByIdOrThrowAsync(int id);
        Task<(List<ChapterResponseDTO> Data, int Total)> GetChaperListAsync(
            int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive);
        Task<bool> ReorderChaptersAsync(int courseId, List<int> chapterId);

        // --- Phần dành cho Thùng rác ---
        Task RestoreAsync(int id, string role, int userId);
        Task HardDeleteAsync(int id, string role, int userId);
        Task<(List<ChapterResponseDTO> Data, int Total)> GetDeletedChapterListAsync( int courseId,
            int page, int pageSize, string keySearch);
    }
}