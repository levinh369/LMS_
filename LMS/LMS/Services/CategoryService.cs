using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using System.Linq.Expressions;

namespace LMS.Services
{
    public class CategoryService : ICategoryService
    {
        private ICategoryRepository categoryRepository;
        public CategoryService(ICategoryRepository categoryRepository)
        {
            this.categoryRepository = categoryRepository;
        }
        public async Task CreateAsync(CategoryRequestDTO dto)
        {
            var exist = await categoryRepository.GetByNameAsync(dto.Name);
            if (exist != null)
            {
                throw new Exception("Danh mục đã tồn tại!");
            }
            var category = new CategoryModel
            {
                Name = dto.Name,
                Description = dto.Description,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow.AddHours(7),
            };
            await categoryRepository.AddAsync(category);
        }

        public async Task DeleteAsync(int id)
        {
            var exist = await GetByIdOrThrowAsync(id);
            if (exist.IsDeleted)
            {
                throw new Exception("Danh mục đã bị xóa trước đó rồi");
            }
            await categoryRepository.DeleteAsync(exist);
        }

        public async Task<IEnumerable<CategoryResponeDTO>> GetAllAsync()
        {
            var categories = await categoryRepository.GetAllAsync();
            return categories.Select(c => new CategoryResponeDTO
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                CreateAt = c.CreatedAt,
            });
        }

        public async Task<CategoryResponeDTO> GetByIdAsync(int id)
        {
            var entity = await GetByIdOrThrowAsync(id);
            var category = new CategoryResponeDTO
            {
                Id = entity.Id,
                Name = entity.Name,
                Description = entity.Description,
                CreateAt = entity.CreatedAt,
                IsActive = entity.IsActive,
            };
            return category;
        }

        public async Task<CategoryModel> GetByIdOrThrowAsync(int id)
        {
            var entity = await categoryRepository.GetByIdAsync(id);
            if (entity == null)
                throw new Exception("Danh mục khóa học không tồn tại");
            return entity;
        }

        public async Task<(List<CategoryModel> Data, int Total)> GetCategoryListAsync(int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive)
        {
            var (entities, total) = await categoryRepository.GetPagedAsync(page, pageSize, keySearch, fromDate, toDate, isActive);
            var modelList = entities.Select(c => new CategoryModel
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
            }).ToList();
            return (modelList, total);
        }

        public async Task<(List<CategoryResponeDTO> Data, int Total)> GetDeletedCategoryListAsync(int page, int pageSize, string keySearch)
        {
            Expression<Func<CategoryModel, bool>> filter = x =>
                string.IsNullOrEmpty(keySearch) || x.Name.Contains(keySearch);

            // 2. Gọi Repo lấy Entity
            var (entities, total) = await categoryRepository.GetDeletedListAsync(filter, page, pageSize);

            // 3. Map sang DTO
            var dtoList = entities.Select(c => new CategoryResponeDTO
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                IsActive = c.IsActive,
                UpdateAt = c.UpdatedAt
            }).ToList();

            return (dtoList, total);
        }

        public async Task HardDeleteAsync(int id)
        {
            var entity = await categoryRepository.GetByIdAsync(id);
            if (entity == null)
                throw new Exception("Danh mục khóa học không tồn tại");
            await categoryRepository.HardDeleteAsync(entity);
        }

        public async Task RestoreAsync(int id)
        {
            var entity = await categoryRepository.GetByIdAsync(id);
            if (entity == null)
                throw new Exception("Danh mục khóa học không tồn tại");
            await categoryRepository.RestoreAsync(entity);
        }

        public async Task UpdateAsync(int id, CategoryRequestDTO dto)
        {
            var categgory = await GetByIdOrThrowAsync(id);
            if (categgory.IsDeleted)
                throw new Exception("Danh mục khóa học đã bị xóa trước đó rồi!");
            categgory.Name = dto.Name;
            categgory.Description = dto.Description;
            categgory.UpdatedAt = DateTime.UtcNow;
            categgory.IsActive = dto.IsActive;
            await categoryRepository.UpdateAsync(categgory);
        }
        public async Task<bool> RestoreBulkAsync(List<int> ids)
        {
            if (ids == null || !ids.Any()) return false;
            return await categoryRepository.UpdateDeleteStatusBulkAsync(ids, false);
        }

        public async Task<bool> SoftDeleteBulkAsync(List<int> ids)
        {
            if (ids == null || !ids.Any()) return false;
            return await categoryRepository.UpdateDeleteStatusBulkAsync(ids, true);
        }

        public async Task<bool> HardDeleteBulkAsync(List<int> ids)
        {
            if (ids == null || !ids.Any()) return false;
            return await categoryRepository.HardDeleteBulkAsync(ids);
        }
    }
}
