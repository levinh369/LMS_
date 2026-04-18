using LMS.DTOs.Request;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoadMapController : ControllerBase
    {
        private readonly IRoadMapService roadMapService;
        public RoadMapController(IRoadMapService roadMapService)
        {
            this.roadMapService = roadMapService;
        }
        [HttpPost]
        public async Task<IActionResult> AddAsync([FromForm] RoadMapRequestDTO dto)
        {
            await roadMapService.CreateAsync(dto);
            return Ok(new
            {
                message = "Thêm lộ trình học thành công!"
            });
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAynsc(int id)
        {
            await roadMapService.DeleteAsync(id);
            return Ok(new
            {
                message = "Xóa lộ trình thành công"
            });
        }
        [HttpPatch("{id}/status")] 
        public async Task<IActionResult> ChangeStatus(int id)
        {
            await roadMapService.ChangeStatus(id);
             return Ok(new
             {
                 success = true,
                 message = "Cập nhật trạng thái lộ trình thành công!"
             });
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAsync(int id, RoadMapRequestDTO dto)
        {
            await roadMapService.UpdateAsync(id, dto);
            return Ok(new
            {
                message = "Cập nhật lộ trình thành công"
            });
        }
        [HttpGet]
        public async Task<IActionResult> GetAllCousers()
        {
            var roadMaps = await roadMapService.GetAllAsync();
            return Ok(new { success = true, data = roadMaps });
        }
        [HttpGet("{id}/builder-data")]
        public async Task<IActionResult> GetBuilderData(int id)
        {
            var roadmapDetail = await roadMapService.GetRoadmapDetail(id);
            return Ok(new
            {
                success = true,
                data = roadmapDetail
            });
        }
        [HttpGet("{id}/detail")]
        public async Task<IActionResult> RoadMapDetail(int id)
        {
            var roadmapDetail = await roadMapService.RoadMapDetail(id);
            return Ok(new
            {
                success = true,
                data = roadmapDetail
            });
        }
        [HttpGet("top-roadmaps")]
        public async Task<IActionResult> GetTopRoadMaps()
        {
            var roadMaps = await roadMapService.GetTopRoads();
            return Ok(new
            {
                success = true,
                data = roadMaps
            });
        }
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAllRoadMaps()
        {
            var roadMaps = await roadMapService.GetAllRoadMaps();
            return Ok(new
            {
                success = true,
                data = roadMaps
            });
        }
        [HttpPost("{id}/courses")]
        public async Task<IActionResult> SaveCourses(int id, [FromBody] List<RoadmapUpdateDTO> items)
        {
            try
            {
                // Gửi cả list object xuống Service
                var success = await roadMapService.SaveRoadmapCourses(id, items);
                if (success)
                    return Ok(new { success = true, message = "Lưu lộ trình bài bản thành công!" });

                return BadRequest(new { success = false, message = "Có lỗi xảy ra khi lưu dữ liệu." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var data = await roadMapService.GetByIdAsync(id);
            if (data == null) return NotFound(new { message = "Không tìm thấy lộ trình" });
            return Ok(data);
        }
        [HttpGet("list-data")]
        public async Task<IActionResult> ListData(
        int page = 1,
        int pageSize = 10,
        string keySearch = "",
        int isActive = -1)
        {
            var (data, total) = await roadMapService.GetRoadMapListAsync(
                page, pageSize, keySearch, isActive);
            return Ok(new
            {
                success = true,
                total = total,
                data = data
            });
        }
    }
}
