using LMS.DTOs.Request;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notifService;

        public NotificationController(INotificationService notifService)
        {
            _notifService = notifService;
        }
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập để thực hiện chức năng này!" });
            }
            try
            {
                int userId = int.Parse(userIdClaim.Value);
                var list = await _notifService.GetUserNotificationsAsync(userId);
                var unread = await _notifService.GetUnreadCountAsync(userId);
                return Ok(new { data = list, unreadCount = unread });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập để thực hiện chức năng này!" });
            }

            try
            {
                int userId = int.Parse(userIdClaim.Value);
                var count = await _notifService.GetUnreadCountAsync(userId);
                return Ok(new { count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        // Gọi cái này khi User click vào 1 thông báo cụ thể
        [HttpPost("mark-read/{id}")]
        public async Task<IActionResult> MarkRead(int id)
        {
            await _notifService.MarkAsReadAsync(id);
            return Ok();
        }
        [HttpPost("mark-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập để thực hiện chức năng này!" });
            }
            try
            {
                int userId = int.Parse(userIdClaim.Value);
                await _notifService.MarkAllAsReadAsync(userId);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpGet("GetNotif")]
        public async Task<IActionResult> GetNotif([FromQuery] int skip = 0, [FromQuery] int limit = 10)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập để thực hiện chức năng này!" });
            }

            try
            {
                int userId = int.Parse(userIdClaim.Value);

                // Truyền skip và limit vào service
                // Bác nhớ sửa tên hàm trong Service thành GetByUserIdAsync (hoặc tên hàm bác vừa sửa)
                var notifs = await _notifService.GetUserNotificationsAsync(userId, skip, limit);

                return Ok(new { data = notifs });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
