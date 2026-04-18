using LMS.Models;

namespace LMS.Repositories.Interfaces
{
    public interface IChapterRepository : IRepository<ChapterModel>
    {
        Task<(List<ChapterModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch,
            DateTime? fromDate, DateTime? toDate, int isAcitve);
        Task<ChapterModel?> GetByTitleAsync(string title, int id);
        Task<List<ChapterModel>?> GetByCourseIdAsync(int courseId);
        
        Task ChangeStatusAsync(ChapterModel entity);
        Task<bool> UpdateChapterOrderAsync(int courseId, List<int> chapterIds);
    }
}
