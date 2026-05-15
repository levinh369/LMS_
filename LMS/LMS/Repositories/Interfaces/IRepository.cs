using LMS.Models;
using System.Linq.Expressions;

namespace LMS.Repositories.Interfaces
{
    public interface IRepository<T> where T : BaseModel
    {
        Task<T?> GetByIdAsync(int id);
        Task<IEnumerable<T>> GetAllAsync();
        Task AddAsync(T entity);
        Task DeleteAsync(T entity);
        Task UpdateAsync(T entity);
        Task ChangeStatus(T entity);
        Task RestoreAsync(T entity);         // Khôi phục từ thùng rác (IsActive = true)
        Task HardDeleteAsync(T entity);      // Xóa vĩnh viễn khỏi Database
        Task<bool> HardDeleteBulkAsync(List<int> ids);
        Task<bool> UpdateDeleteStatusBulkAsync(List<int> ids, bool isDeleted);
        Task<(List<T> Data, int Total)> GetDeletedListAsync(
    Expression<Func<T, bool>> filter,
    int page,
    int pageSize,
    params Expression<Func<T, object>>[] includeProperties);
    }
}
