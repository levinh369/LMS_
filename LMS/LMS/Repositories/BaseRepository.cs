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
        public async Task<bool> UpdateDeleteStatusBulkAsync(List<int> ids, bool isDeleted)
        {
            var entities = await _dbSet.IgnoreQueryFilters()
                                       .Where(x => ids.Contains(x.Id))
                                       .ToListAsync();

            if (!entities.Any()) return false;

            foreach (var entity in entities)
            {
                entity.IsDeleted = isDeleted; 
                entity.UpdatedAt = DateTime.Now;
            }

            _dbSet.UpdateRange(entities);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> HardDeleteBulkAsync(List<int> ids)
        {
            var entities = await _dbSet.IgnoreQueryFilters()
                                       .Where(x => ids.Contains(x.Id))
                                       .ToListAsync();

            if (!entities.Any()) return false;

            _dbSet.RemoveRange(entities);
            return await _context.SaveChangesAsync() > 0;
        }
        public async Task<(List<T> Data, int Total)> GetDeletedListAsync(
     Expression<Func<T, bool>> filter,
     int page,
     int pageSize,
     params Expression<Func<T, object>>[] includeProperties) // Thêm tham số này
        {
            var query = _dbSet.IgnoreQueryFilters().Where(x => x.IsDeleted == true);

            // Tự động Include các bảng liên quan nếu có truyền vào
            foreach (var includeProperty in includeProperties)
            {
                query = query.Include(includeProperty);
            }

            if (filter != null)
            {
                query = query.Where(filter);
            }

            int total = await query.CountAsync();

            var data = await query
                .OrderByDescending(x => x.UpdatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
        }
    }
}
