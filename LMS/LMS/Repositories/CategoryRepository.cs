using LMS.Data;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class CategoryRepository : BaseRepository<CategoryModel>, ICategoryRepository
    {
        public CategoryRepository(ApplicationDbContext context) : base(context)
        {
        }
        public async Task<CategoryModel?> GetByNameAsync(string name)
        {
            return await _context.Categories.FirstOrDefaultAsync(c => c.Name == name && !c.IsDeleted);
        }

        public async Task<(List<CategoryModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch,
            DateTime? fromDate, DateTime? toDate, int isAcitve)
        {
            var query = _context.Categories.AsNoTracking().Where(c => !c.IsDeleted);
            if (!string.IsNullOrEmpty(keySearch))
                query = query.Where(d => d.Name.Contains(keySearch));
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
    }
}
