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
        private readonly ICourseRepository _courseRepository;
        public CommentService(ICommentRepository commentRepository, INotificationService notificationService, IUserRepository userRepository, ICourseRepository courseRepository)
        { 
            _commentRepository = commentRepository;
            this.notificationService = notificationService;
            _userRepository = userRepository;
            _courseRepository = courseRepository;
        }
        public async Task<bool> AddAsync(CommentRequestDTO dto, int userId, string userName)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Content)) return false;

                var comment = new CommentModel
                {
                    Content = dto.Content,
                    LessonId = dto.LessonId,
                    ParentId = dto.ParentId,
                    ReplyToUserId = dto.ReplyToUserId,
                    ReplyToUserName = dto.ReplyToUserName,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow.AddHours(7),
                    IsActive = true,
                };

                await _commentRepository.AddAsync(comment);

                // 1. Lấy thông tin khóa học để tìm TeacherId
                var course = await _courseRepository.GetByIdAsync(dto.CourseId);
                if (course == null) return true; // Comment vẫn thành công nhưng không bắn thông báo

                string url = $"/learn/learning.html?id={dto.CourseId}&lessonId={dto.LessonId}#comment-{comment.Id}";

                // --- LUỒNG 1: BÁO CHO GIẢNG VIÊN ---
                // Chỉ gửi nếu người comment KHÔNG PHẢI là giảng viên
                if (course.TeacherId != userId)
                {
                    string teacherMsg = $"Học viên <b>{userName}</b> đã thảo luận trong khóa học <b>{course.Title}</b>.";
                    await notificationService.SendNotificationAsync(
                        course.TeacherId.Value,
                        userId,
                        teacherMsg,
                        NotificationTypeEnum.NewComment, // Dùng type 5 (NewComment)
                        url,
                        null
                    );
                }

                // --- LUỒNG 2: BÁO CHO NGƯỜI BỊ TRẢ LỜI ---
                if (dto.ReplyToUserId.HasValue && dto.ReplyToUserId.Value > 0)
                {
                    // Chỉ gửi nếu người bị trả lời KHÔNG PHẢI là chính mình
                    // VÀ người bị trả lời KHÔNG PHẢI là giảng viên (đã gửi ở trên rồi để tránh lặp)
                    if (dto.ReplyToUserId.Value != userId && dto.ReplyToUserId.Value != course.TeacherId)
                    {
                        string replyMsg = $"<b>{userName}</b> đã trả lời bình luận của bạn.";
                        await notificationService.SendNotificationAsync(
                            dto.ReplyToUserId.Value,
                            userId,
                            replyMsg,
                            NotificationTypeEnum.CommentReply, // Dùng type 1 (CommentReply)
                            url,
                            null
                        );
                    }
                }

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
                    CreatedAt = DateTime.UtcNow.AddHours(7),
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
                        string url = $"/learn/learning.html?id={courseId}&lessonId={request.LessonId}#comment-{comment.Id}";

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
                ReplyToUserName = c.ReplyToUserName,
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
                    string url = $"/learn/learning.html?id={comment.Lesson.CourseModelId}&lessonId={comment.LessonId}#comment-{comment.Id}";

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
