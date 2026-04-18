using LMS.DTOs;
using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Services.Interfaces
{
    public interface ICategoryService
    {
        Task<IEnumerable<CategoryResponeDTO>> GetAllAsync();
        Task<CategoryResponeDTO> GetByIdAsync(int id);
        Task UpdateAsync(int id, CategoryRequestDTO dto);
        Task DeleteAsync(int id);
        Task CreateAsync(CategoryRequestDTO dto);
        Task<CategoryModel> GetByIdOrThrowAsync(int id);
        Task<(List<CategoryModel> Data, int Total)> GetCategoryListAsync(
        int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive);
    }
}
