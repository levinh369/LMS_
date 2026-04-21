using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using System.ComponentModel.DataAnnotations;
using static LMS.Controllers.CommentController;

namespace LMS.Services
{
    public class CommentService : ICommentService
    {
        private readonly ICommentRepository _commentRepository;
        private readonly INotificationService notificationService;
        private readonly IUserRepository _userRepository;
        public CommentService(ICommentRepository commentRepository, INotificationService notificationService, IUserRepository userRepository)
        { 
            _commentRepository = commentRepository;
            this.notificationService = notificationService;
            _userRepository = userRepository;
        }
        public async Task<bool> AddAsync(CommentRequestDTO dto, int userId, string userName)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Content)) return false;

                // 1. Tạo Model chung (Dùng cho cả Cha và Con)
                var comment = new CommentModel
                {
                    Content = dto.Content,
                    LessonId = dto.LessonId,
                    ParentId = dto.ParentId, // Nếu là cha thì null, nếu là con thì có ID
                    UserId = userId,
                    CreatedAt = DateTime.Now,
                    IsActive = true,
                };

                await _commentRepository.AddAsync(comment);

                // 2. LOGIC THÔNG BÁO (Chỉ chạy khi là Reply)
                if (dto.ParentId.HasValue && dto.ParentId.Value > 0)
                {
                    var parentComment = await _commentRepository.GetCommentByIdAsync(dto.ParentId.Value);

                    // Chỉ bắn tbao nếu người reply không phải là chủ comment (tránh tự luyến)
                    if (parentComment != null && parentComment.UserId != userId)
                    {
                        string message = $"<b>{userName}</b> đã trả lời bình luận của bạn.";
                        string url = $"/pages/learn/learning.html?id={parentComment.Lesson.CourseModelId}&lessonId={dto.LessonId}#comment-{comment.Id}";

                        await notificationService.SendNotificationAsync(
                            parentComment.UserId,
                            userId,
                            message,
                            NotificationTypeEnum.CommentReply,
                            url,
                            null
                        );
                    }
                }
                // Nếu ParentId là null -> Không làm gì (hoặc báo cho giảng viên nếu muốn)

                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }
        public async Task<bool> ProcessPinAsync(PinRequest request, int adminId, string adminName)
        {
            if (request.IsNew)
            {
                var newComment = new CommentModel
                {
                    Content = request.Content,
                    LessonId = request.LessonId,
                    UserId = adminId,
                    ParentId = null, 
                    IsPinned = true,
                    CreatedAt = DateTime.Now,
                    IsActive = true
                };

                var id = await _commentRepository.HandlePinLogicAsync(newComment, true);
                return id > 0;
            }
            else
            {
                var updateModel = new CommentModel
                {
                    Id = request.CommentId.Value,
                    LessonId = request.LessonId
                };

                var id = await _commentRepository.HandlePinLogicAsync(updateModel, false);

                if (id > 0)
                {
                    // Bắn thông báo cho "khổ chủ"
                    var comment = await _commentRepository.GetCommentByIdAsync(request.CommentId.Value);
                    if (comment != null && comment.UserId != adminId)
                    {
                        string message = $"📌 <b>{adminName}</b> đã ghim bình luận của bạn lên đầu bài học.";
                        var courseId = comment.Lesson?.Chapter?.CourseId ?? 0;
                        string url = $"/pages/learn/learning.html?id={courseId}&lessonId={request.LessonId}#comment-{comment.Id}";

                        await notificationService.SendNotificationAsync(
                            comment.UserId,
                            adminId,
                            message,
                            NotificationTypeEnum.CommentPinned,
                            url,
                            null
                        );
                    }
                }
                return id > 0;
            }
        }
        public async Task<bool> DeleteAsync(int commentId)
        {
            return await _commentRepository.SoftDeleteAsync(commentId);
        }

        public async Task<bool> DeleteCommentAsync(int commentId, int userId)
        {
            if (commentId <= 0 || userId <= 0)
                throw new ArgumentException("Dữ liệu đầu vào không hợp lệ.");
            var result = await _commentRepository.DeleteCommentAsync(commentId, userId);

            if (!result)
                throw new UnauthorizedAccessException("Bạn không có quyền xóa comment không tồn tại.");

            return true;
        }


        public async Task<bool> EditCommentAsync(int commentId, string newComment, int userId)
        {
            if (commentId <= 0 || userId <= 0)
                throw new ArgumentException("Dữ liệu đầu vào không hợp lệ.");

            if (string.IsNullOrWhiteSpace(newComment))
                throw new ValidationException("Nội dung không được để trống.");

            var result = await _commentRepository.EditCommentAsync(commentId, newComment, userId);

            if (!result)
                throw new UnauthorizedAccessException("Bạn không có quyền sửa hoặc comment không tồn tại.");

            return true;
        }

        public async Task<(List<AdminCommentResponseDTO> Items, int TotalCount)> GetAdminCommentsAsync(int pageIndex, int? courseId, int? lessonId, string? search, string status)
        {
            return await _commentRepository.GetAdminCommentsAsync(pageIndex, courseId, lessonId, search,status);
        }

        public async Task<List<CommentResponseDTO>> GetCommentListAsync(int lessonId, int userId)
        {
            var comments = await _commentRepository.GetByComment(lessonId, userId);
            var response = comments.Select(c => new CommentResponseDTO
            {
                Id = c.Id,
                Content = c.Content,
                UserId = c.UserId,
                UserFullName = c.User?.FullName ?? "Người dùng LMS",
                UserAvatar = c.User?.AvatarUrl ?? "/assets/img/default-avatar.png",
                CreatedAt = c.CreatedAt,
                ParentId = c.ParentId,
                IsPinned = c.IsPinned,
                ReplyCount = c.Replies?.Count ?? 0,
                TotalReactions = c.TotalReactions,
                LikeCount = c.LikeCount,
                IsLiked = c.IsLiked,
                ReplyToUserName = c.ParentComment?.User?.FullName,
                ReactionType = c.UserReaction != null ? (int)c.UserReaction : 0,
                ReactionStats = c.ReactionStats,
                TopReactionTypes = c.ReactionStats
                .OrderByDescending(s => s.Count)
                .Take(3)
                .Select(s => s.Type)
                .ToList()
                }).ToList();

            return response;
        }

        public async Task<List<CommentReactionDetailResponseDTO>> GetReactionDetailServiceAsync(int commentId)
        {
            if(commentId <= 0)
            {
                {
                    throw new Exception("ID comment không hợp lệ!");
                }
            }
            var result = await _commentRepository.GetReactionDetailsAsync(commentId);
            return result;
        }
        public async Task<ReactionResultDTO> HandleLike(int userId, int commentId, ReactionTypeEnum type)
        {
            if (commentId <= 0) throw new Exception("ID comment không hợp lệ!");

            // 1. Chạy logic DB (Like/Unlike) như cũ
            var result = await _commentRepository.HandleReactionAsync(userId, commentId, type);

            // 2. CHỈ BẮN THÔNG BÁO KHI LÀ "LIKE MỚI" (Không bắn khi Unlike)
            // Giả sử ReactionResultDTO của bác có thuộc tính IsLiked (vừa mới Like xong)
            if (result.IsLiked)
            {
                // Lấy thông tin comment để biết ai là người nhận (ReceiverId)
                var comment = await _commentRepository.GetCommentByIdAsync(commentId);

                // Không tự gửi thông báo cho chính mình
                if (comment != null && comment.UserId != userId)
                {
                    var sender = await _userRepository.GetByIdAsync(userId);
                    string userName = sender?.FullName ?? "Người dùng";
                    string reactionText = type switch
                    {
                        ReactionTypeEnum.Like => "đã thích",
                        ReactionTypeEnum.Love => "đã yêu thích",
                        ReactionTypeEnum.Haha => "đã bày tỏ cảm xúc Haha về",
                        ReactionTypeEnum.Wow => "đã bày tỏ cảm xúc Wow về",
                        ReactionTypeEnum.Sad => "đã bày tỏ cảm xúc Buồn về",
                        ReactionTypeEnum.Angry => "đã phẫn nộ với",
                        _ => "đã tương tác với"
                    };
                    string message = $"<b>{userName}</b> {reactionText} bình luận của bạn.";
                    string url = $"/pages/learn/learning.html?id={comment.Lesson.CourseModelId}&lessonId={comment.LessonId}#comment-{comment.Id}";

                    // GỌI HÀM REAL-TIME CỦA BÁC
                    await notificationService.SendNotificationAsync(
                        comment.UserId,
                        userId,
                        message,
                        NotificationTypeEnum.LikeComment,
                        url,
                        type
                    );
                }
            }

            return result;
        }

        public async Task<bool> RestoreAsync(int commentId)
        {
            return await _commentRepository.RestoreAsync(commentId);
        }

        public async Task<bool> ToggleHideCommentAsync(int id)
        {
            return await _commentRepository.ToggleHideCommentAsync(id);
        }
    }
}
