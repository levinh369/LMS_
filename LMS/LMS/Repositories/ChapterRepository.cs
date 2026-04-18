using LMS.Data;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class ChapterRepository : BaseRepository<ChapterModel>, IChapterRepository
    {
        public ChapterRepository(ApplicationDbContext context) : base(context)
        {
        }

        public async Task ChangeStatusAsync(ChapterModel entity)
        {
            _context.Chapters.Update(entity);
            await _context.SaveChangesAsync();

        }

        public async Task<List<ChapterModel>?> GetByCourseIdAsync(int courseId)
        {
            return await _context.Chapters.AsNoTracking().Where(c => c.CourseId == courseId).ToListAsync();
        }

        public async Task<ChapterModel?> GetByTitleAsync(string title, int id)
        {
            if (string.IsNullOrEmpty(title)) return null;
            return await _context.Chapters.AsNoTracking().Where(c => c.CourseId == id && c.Title.ToLower() == title.ToLower() && !c.IsDeleted).FirstOrDefaultAsync();
        }

        public async Task<(List<ChapterModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isAcitve)
        {
            var query = _context.Chapters.AsNoTracking().Where(c => !c.IsDeleted);
            if (!string.IsNullOrEmpty(keySearch))
                query = query.Where(d => d.Title.Contains(keySearch));
            if (fromDate.HasValue)
                query = query.Where(d => d.CreatedAt >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(d => d.CreatedAt <= toDate.Value);
            if (isAcitve != -1)
                query = query.Where(d => d.IsActive == (isAcitve == 1));
            int total = await query.CountAsync();
            var data = await query
                .OrderByDescending(d => d.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            return (data, total);
        }

        public async Task<bool> UpdateChapterOrderAsync(int courseId, List<int> chapterIds)
        {
            var chapters = await _context.Chapters
             .Where(c => c.CourseId == courseId && chapterIds.Contains(c.Id))
             .ToListAsync();
            if (chapters.Count != chapterIds.Count)
            {
                return false;
            }
            foreach (var chapter in chapters)
            {
                int newIndex = chapterIds.IndexOf(chapter.Id);
                if (newIndex != -1)
                {
                    chapter.OrderIndex = newIndex + 1;
                    chapter.UpdatedAt = DateTime.UtcNow;
                }
            }
            return await _context.SaveChangesAsync() > 0;
        
        }
    }
}
