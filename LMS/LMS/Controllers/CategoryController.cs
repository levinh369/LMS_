using LMS.DTOs.Request;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Controllers
{
    [Authorize(Roles = "Admin")]
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
        [AllowAnonymous]
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
        [HttpGet("list-deleted")]
        public async Task<IActionResult> GetDeletedList(int page = 1, int pageSize = 10, string? keySearch = "")
        {
            try
            {
                var (data, total) = await categoryService.GetDeletedCategoryListAsync(page, pageSize, keySearch ?? "");

                return Ok(new
                {
                    Success = true,
                    Data = data,
                    Total = total,
                    Page = page,
                    PageSize = pageSize
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Success = false, Message = ex.Message });
            }
        }

        [HttpPost("restore/{id}")]
        public async Task<IActionResult> Restore(int id)
        {
            try
            {
                await categoryService.RestoreAsync(id);
                return Ok(new { Success = true, Message = "Khôi phục danh mục thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        [HttpDelete("hard-delete/{id}")]
        public async Task<IActionResult> HardDelete(int id)
        {
            try
            {
                await categoryService.HardDeleteAsync(id);
                return Ok(new { Success = true, Message = "Đã xóa vĩnh viễn danh mục" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = "Không thể xóa vĩnh viễn danh mục này vì có dữ liệu liên quan." });
            }
        }
        [HttpPost("soft-delete-bulk")]
        public async Task<IActionResult> SoftDeleteBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var result = await categoryService.SoftDeleteBulkAsync(ids);
            if (result)
                return Ok(new { Success = true, Message = $"Đã chuyển {ids.Count} mục vào thùng rác." });

            return BadRequest(new { Success = false, Message = "Không thể xóa các mục đã chọn." });
        }
        [HttpPost("restore-bulk")]
        public async Task<IActionResult> RestoreBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var result = await categoryService.RestoreBulkAsync(ids);
            if (result)
                return Ok(new { Success = true, Message = $"Đã khôi phục {ids.Count} khóa học thành công." });

            return BadRequest(new { Success = false, Message = "Khôi phục thất bại. Vui lòng thử lại." });
        }

        [HttpDelete("hard-delete-bulk")]
        public async Task<IActionResult> HardDeleteBulk([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any())
                return BadRequest(new { Success = false, Message = "Danh sách ID không hợp lệ." });

            var result = await categoryService.HardDeleteBulkAsync(ids);
            if (result)
                return Ok(new { Success = true, Message = $"Đã xóa vĩnh viễn {ids.Count} khóa học." });

            return BadRequest(new { Success = false, Message = "Không thể xóa vĩnh viễn dữ liệu." });
        }

    }
}
