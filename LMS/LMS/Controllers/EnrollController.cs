using CloudinaryDotNet.Core;
using LMS.DTOs.Request;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Storage;
using System.Security.Claims;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EnrollController : ControllerBase
    {
        private readonly IEnrollmentService enrollmentService;
        public EnrollController(IEnrollmentService enrollmentService)
        {
            this.enrollmentService = enrollmentService;
        }
        [HttpPost("register")] // Đổi tên route cho rõ nghĩa
        public async Task<IActionResult> AddAsync([FromBody] EnrollRequestDTO dto) 
        {
            // 1. Lấy UserId từ Claim (Đoạn này ông làm chuẩn rồi)
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized(new { message = "Bác chưa đăng nhập kìa!" });

            int userId = int.Parse(userIdClaim.Value);

            try
            {
                var result = await enrollmentService.AddEnrollAsync(userId, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    isSuccess = false,
                    message = ex.Message
                });
            }
        }
        [HttpGet("check/{courseId}")]
        public async Task<IActionResult> Check(int courseId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized(new { message = "Bác chưa đăng nhập kìa!" });

            int userId = int.Parse(userIdClaim.Value);

            try
            {
                var result = await enrollmentService.IsEnrolledAsync(userId, courseId);
                return Ok(new { isEnrolled = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { isSuccess = false, message = ex.Message });
            }
        }

    }
}
