using LMS.Models;

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
    }
}
