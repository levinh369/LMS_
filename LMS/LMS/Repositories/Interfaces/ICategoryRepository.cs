using LMS.Models;

namespace LMS.Repositories.Interfaces
{
    public interface ICategoryRepository : IRepository<CategoryModel>
    {
        Task<CategoryModel?> GetByNameAsync(string name);
        Task<(List<CategoryModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch,
            DateTime? fromDate, DateTime? toDate, int isAcitve);
    }
}
