using Azure.Core;
using LMS.DTOs.Request;
using LMS.Enums;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CommentController : ControllerBase
    {
        private ICommentService commentService;
        public CommentController(ICommentService commentService)
        {
            this.commentService = commentService;
        }
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] CommentRequestDTO dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            // Lấy UserName từ Claim Name
            var userNameClaim = User.FindFirst(ClaimTypes.Name);

            if (userIdClaim == null || userNameClaim == null)
            {
                return Unauthorized(new { message = "Không tìm thấy thông tin người dùng!" });
            }

            int userId = int.Parse(userIdClaim.Value);
            string userName = userNameClaim.Value; // Đây là tên để bác bắn thông báo

            // Truyền thêm userName vào hàm AddAsync
            var isSuccess = await commentService.AddAsync(dto, userId, userName);

            if (!isSuccess)
            {
                return BadRequest(new { message = "Không thể gửi bình luận. Vui lòng kiểm tra lại!" });
            }

            return Ok(new { message = "Gửi bình luận thành công!" });
        }
        [HttpGet("lesson/{lessonId}")]
        public async Task<IActionResult> GetAllComments(int lessonId)
        {
            try
            {
                if (lessonId <= 0)
                {
                    return BadRequest(new { message = "ID bài học không hợp lệ!" });
                }
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                int currentUserId = 0;

                if (userIdClaim != null)
                {
                    currentUserId = int.Parse(userIdClaim.Value);
                }

                var comments = await commentService.GetCommentListAsync(lessonId, currentUserId);

                return Ok(new
                {
                    success = true,
                    data = comments
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi server khi lấy bình luận!" });
            }
        }
        [HttpPost("handleLike/{commentId}")]
        public async Task<IActionResult> HandleLike(int commentId, [FromBody] ReactionRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập để thực hiện chức năng này!" });
            }

            try
            {
                int userId = int.Parse(userIdClaim.Value);

                // Lấy 'type' từ trong request body
                var result = await commentService.HandleLike(userId, commentId, request.Type);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpGet("getReactions/{commentId}")]
        public async Task<IActionResult> getReactions(int commentId)
        {
            try 
            {
                var result = await commentService.GetReactionDetailServiceAsync(commentId);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch(Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPut("update/{id}")]
        public async Task<IActionResult> EditComment(int id, [FromBody] string content)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập để thực hiện chức năng này!" });
            }
            try
            {
                int userId = int.Parse(userIdClaim.Value);

                var success = await commentService.EditCommentAsync(id, content, userId);

                if (!success)
                {
                    return BadRequest(new { message = "Cập nhật thất bại hoặc bạn không có quyền!" });
                }

                return Ok(new { success = true });
            }
            catch(Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPut("delete/{id}")]
        public async Task<IActionResult> DeleteComment(int id)
        {

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
            {
                return Unauthorized(new { message = "Bạn cần đăng nhập để thực hiện chức năng này!" });
            }
            try
            {
                int userId = int.Parse(userIdClaim.Value);

                var success = await commentService.DeleteCommentAsync(id, userId);

                if (!success)
                {
                    return BadRequest(new { message = "Xóa thất bại hoặc bạn không có quyền!" });
                }

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpGet("manager-comment")]
        public async Task<IActionResult> GetManagerComments(
       [FromQuery] int page = 1,
       [FromQuery] int? courseId = null,
       [FromQuery] string? search = null,
       [FromQuery] string status = "active") 
        {
            // Chặn nếu page nhỏ hơn 1
            if (page < 1) page = 1;
            var (items, total) = await commentService.GetAdminCommentsAsync(page, courseId, search, status);

            return Ok(new
            {
                success = true,
                Data = items,
                TotalCount = total,
                PageSize = 5,
                CurrentPage = page,
                TotalPages = (int)Math.Ceiling((double)total / 5)
            });
        }
        [HttpPut("toggle-status/{id}")] // Dùng HttpPut cho hành động cập nhật
        //[Authorize(Roles = "Admin")]    // Nhớ bảo mật, không học viên nó tự ẩn comment của nhau
        public async Task<IActionResult> UpdateIsActive(int id)
        {
            // Gọi Service xử lý đảo trạng thái
            var result = await commentService.ToggleHideCommentAsync(id);

            if (!result)
            {
                // Nếu không tìm thấy comment hoặc lỗi DB
                return NotFound(new { success = false, message = "Không tìm thấy bình luận này!" });
            }

            // Trả về kết quả thành công
            return Ok(new { success = true, message = "Cập nhật trạng thái thành công!" });
        }
        [HttpDelete("{id}")]
        //[Authorize(Roles = "Admin")] // Chỉ Admin mới được quyền "trảm"
        public async Task<IActionResult> AdminDeleteComment(int id)
        {
            // Gọi xuống Service bác vừa viết
            var result = await commentService.DeleteAsync(id);

            if (!result)
            {
                return NotFound(new { success = false, message = "Không tìm thấy bình luận để xóa!" });
            }

            return Ok(new { success = true, message = "Đã ẩn bình luận thành công!" });
        }
        [HttpPut("restore/{id}")]
        public async Task<IActionResult> Restore(int id)
        {
            var result = await commentService.RestoreAsync(id);
            if (!result) return BadRequest(new { success = false, message = "Khôi phục thất bại!" });

            return Ok(new { success = true, message = "Đã khôi phục bình luận thành công!" });
        }

    }
}
