using LMS.DTOs.Request;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Storage;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChapterController : ControllerBase
    {
        private readonly IChapterService chapterService;
        public ChapterController(IChapterService chapterService)
        {
            this.chapterService = chapterService;
        }
        [HttpPost]
        public async Task<IActionResult> AddAsync([FromBody] ChapterRequestDTO dto)
        {
            await chapterService.CreateAsync(dto);
            return Ok(new
            {
                message = "Thêm chương thành công!"
            });
        }
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetByIdAsync(int courseId)
        {
            var chapter = await chapterService.GetByCourseAsync(courseId);
            if (chapter == null) return NotFound("Khóa học không tồn tại");
            return Ok(new
            {
                success = true,
                data = chapter
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
            var (data, total) = await chapterService.GetChaperListAsync(
                page, pageSize, keySearch, fromDate, toDate, isActive);
            return Ok(new
            {
                success = true,
                total = total,
                data = data
            });
        }
        [HttpPut("{id}")] 
        public async Task<IActionResult> UpdateAsync(int id, [FromBody] ChapterRequestDTO dto)
        {
            var isSuccess = await chapterService.UpdateAsync(id, dto);
            if (isSuccess == "NOT_FOUND")
                return NotFound(new { message = "Không tìm thấy chương!" });

            if (isSuccess == "DUPLICATE_NAME")
                return BadRequest(new { message = "Tên chương này đã tồn tại!" });

            if (isSuccess == "SUCCESS")
                return Ok(new { success = true, message = "Cập nhật thành công!" });

            return BadRequest(new { message = "Có lỗi xảy ra!" });
        }
        [HttpPut("{chapterId}/status")]
        public async Task<IActionResult> ChangeStatusAsync(int chapterId)
        {
            var isSuccess = await chapterService.ChangeStatusAsync(chapterId);  
            if(isSuccess == "NOT_FOUND")
            {
                return NotFound(new { message = "Không tìm thấy chương!" });
            }
            if(isSuccess == "ID_INVALID")
                return BadRequest(new { message = "ID không hợp lệ!" });

            if (isSuccess == "SUCCESS")
                return Ok(new { success = true, message = "Cập nhật trạng thái thành công!" });

            return BadRequest(new { message = "Có lỗi xảy ra!" });
        }
        [HttpPost("reorder/{courseId}")]
        public async Task<IActionResult> ReorderChapterAsync(int courseId, List<int> chapterIds)
        {
            var isSuccess = await chapterService.ReorderChaptersAsync(courseId,chapterIds);

            if (isSuccess)
                return Ok(new { message = "Thứ tự mới đã được ghi nhận!" });

            return BadRequest("Không cập nhật được thứ tự chương!.");
        }
    }
}
