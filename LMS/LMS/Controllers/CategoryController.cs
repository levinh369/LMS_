using LMS.DTOs.Request;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryController : ControllerBase
    {
        private readonly ICategoryService categoryService;
        public CategoryController(ICategoryService categoryService)
        {
            this.categoryService = categoryService;
        }
        [HttpPost]
        public async Task<IActionResult> AddAsync([FromBody] CategoryRequestDTO dto)
        {
            await categoryService.CreateAsync(dto);
            return Ok(new
            {
                message = "Thêm danh mục thành công!"
            });
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAynsc(int id)
        {
            await categoryService.DeleteAsync(id);
            return Ok(new
            {
                message = "Xóa danh mục thành công"
            });
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAsync(int id, CategoryRequestDTO dto)
        {
            await categoryService.UpdateAsync(id, dto);
            return Ok(new
            {
                message = "Cập nhật danh mục thành công"
            });
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCateAsync(int id)
        {
            var category = await categoryService.GetByIdAsync(id);
            return Ok(category);
        }
        [HttpGet]
        public async Task<IActionResult> GetAllAsync()
        {
            var categories = await categoryService.GetAllAsync();
            return Ok(new
            {
                success = true,
                data = categories
            });
        }
       [HttpGet("list-data")]
        public async Task<IActionResult> ListData(
        int page = 1,
        int pageSize = 10,
        string keySearch = "",
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int isActive = -1)
        {
            var (data, total) = await categoryService.GetCategoryListAsync(
                page, pageSize, keySearch, fromDate, toDate, isActive);
            return Ok(new
            {
                success = true,
                total = total,
                data = data
            });
        }
    }
}
