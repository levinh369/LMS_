using LMS.Data;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace LMS.Repositories
{
    public class BaseRepository<T> : IRepository<T> where T : BaseModel
    {
        protected readonly ApplicationDbContext _context;
        protected readonly DbSet<T> _dbSet;

        // 2. Constructor: Nhận AppDbContext từ Dependency Injection
        public BaseRepository(ApplicationDbContext context)
        {
            _context = context;
            _dbSet = _context.Set<T>();
        }

        public async Task AddAsync(T entity)
        {
            entity.CreatedAt = DateTime.UtcNow.AddHours(7);
            entity.IsDeleted = false;
            await _context.Set<T>().AddAsync(entity);
            await _context.SaveChangesAsync();
        }

        public async Task ChangeStatus(T entity)
        {
            entity.IsActive = !entity.IsActive;
            entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(T entity)
        {
            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<T>> GetAllAsync()
        {
            return await _context.Set<T>().Where(t => !t.IsDeleted && t.IsActive).ToListAsync();
        }

        public async Task<T?> GetByIdAsync(int id)
        {
            return await _context.Set<T>().FindAsync(id);
        }

        public async Task UpdateAsync(T entity)
        {
            _context.Set<T>().Update(entity);
            await _context.SaveChangesAsync();
        }

        // 7. Khôi phục từ thùng rác
        public async Task RestoreAsync(T entity)
        {
            entity.IsDeleted = false;
            entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
            await _context.SaveChangesAsync();
        }

        // 8. Xóa vĩnh viễn khỏi Database
        public async Task HardDeleteAsync(T entity)
        {
            _dbSet.Remove(entity);
            await _context.SaveChangesAsync();
        }

        // 9. Lấy tất cả bản ghi trong thùng rác
        public async Task<IEnumerable<T>> GetDeletedAsync()
        {
            return await _dbSet.Where(x => x.IsDeleted).ToListAsync();
        }

        public async Task<(List<T> Data, int Total)> GetDeletedListAsync(
            Expression<Func<T, bool>> filter,
            int page,
            int pageSize)
        {
            // 1. Tạo query cơ bản lấy các bản ghi ĐÃ XÓA
            // Sử dụng .IgnoreQueryFilters() nếu bạn có dùng Global Query Filter ở DbContext
            var query = _dbSet.IgnoreQueryFilters().Where(x => x.IsDeleted == true);

            // 2. Áp dụng thêm bộ lọc tìm kiếm (ví dụ: theo tên, theo mô tả...)
            if (filter != null)
            {
                query = query.Where(filter);
            }

            // 3. Đếm tổng số lượng để phân trang
            int total = await query.CountAsync();

            // 4. Lấy dữ liệu phân trang
            var data = await query
                .OrderByDescending(x => x.UpdatedAt) // Ưu tiên những cái vừa xóa lên đầu
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
        }
    }
}
