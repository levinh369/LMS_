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
        public async Task<CommentResponseDTO?> AddAsync(CommentRequestDTO dto, int userId, string userName)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Content)) return null;

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
                var user = await _userRepository.GetByIdAsync(userId);
                var course = await _courseRepository.GetByIdAsync(dto.CourseId);
                bool isTeacher = course != null && course.TeacherId == userId;
                if (course != null)
                {
                    string parentQuery = (dto.ParentId != null && dto.ParentId > 0)
                                    ? $"&parentId={dto.ParentId}"
                                    : "";
                    string url = $"/learn/learning.html?id={dto.CourseId}&lessonId={dto.LessonId}{parentQuery}#comment-{comment.Id}";

                    if (course.TeacherId.HasValue && course.TeacherId != userId)
                    {
                        string teacherMsg = $"Học viên <b>{userName}</b> đã thảo luận trong khóa học <b>{course.Title}</b>.";
                        await notificationService.SendNotificationAsync(
                            course.TeacherId.Value,
                            userId,
                            teacherMsg,
                            NotificationTypeEnum.NewComment,
                            url,
                            null
                        );
                    }

                    if (dto.ReplyToUserId.HasValue && dto.ReplyToUserId.Value > 0)
                    {
                        if (dto.ReplyToUserId.Value != userId && dto.ReplyToUserId.Value != course.TeacherId)
                        {
                            string replyMsg = $"<b>{userName}</b> đã trả lời bình luận của bạn.";
                            await notificationService.SendNotificationAsync(
                                dto.ReplyToUserId.Value,
                                userId,
                                replyMsg,
                                NotificationTypeEnum.CommentReply,
                                url,
                                null
                            );
                        }
                    }
                }

                return new CommentResponseDTO
                {
                    UserId = userId,
                    Id = comment.Id,
                    Content = comment.Content,
                    UserFullName = user?.FullName ?? userName,
                    UserAvatar = user?.AvatarUrl,
                    CreatedAt = comment.CreatedAt,
                    ParentId = comment.ParentId,
                    ReplyToUserName = comment.ReplyToUserName,
                    IsAdmin = user?.Role?.RoleName == "Admin", // Nhớ check null Role nếu cần
                    IsTeacher = isTeacher
                };
            }
            catch (Exception ex)
            {
                return null;
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

                var resultId = await _commentRepository.HandlePinLogicAsync(updateModel, false);
                if (resultId == -1) return true;
                if (resultId > 0)
                {
                    var comment = await _commentRepository.GetCommentByIdAsync(request.CommentId.Value);
                    if (comment != null && comment.UserId != adminId)
                    {
                        string message = $"📌 <b>{adminName}</b> đã ghim bình luận của bạn lên đầu bài học.";
                        string url = $"/learn/learning.html?id={request.CourseId}&lessonId={request.LessonId}#comment-{comment.Id}";

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
                return resultId > 0;
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

        public async Task<(List<AdminCommentResponseDTO> Items, int TotalCount)> GetAdminCommentsAsync(int pageIndex, int? courseId, int? lessonId, string? search, string status, int? teacherId)
        {
            return await _commentRepository.GetAdminCommentsAsync(pageIndex, courseId, lessonId, search, status, teacherId);
        }

        public async Task<List<CommentResponseDTO>> GetCommentListAsync(int lessonId, int userId)
        {
            var course = await _courseRepository.GetByLessonId(lessonId);
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
                IsTeacher = course != null && c.UserId == course.TeacherId,
                TopReactionTypes = c.ReactionStats
                .OrderByDescending(s => s.Count)
                .Take(3)
                .Select(s => s.Type)
               .ToList()
            })
                .OrderByDescending(c => c.IsPinned)
                .ThenByDescending(c => c.CreatedAt)
                .ToList();
            return response;
        }

        public async Task<List<CommentReactionDetailResponseDTO>> GetReactionDetailServiceAsync(int commentId)
        {
            if (commentId <= 0)
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
                    string parentQuery = (comment.ParentId != null && comment.ParentId > 0)
                                    ? $"&parentId={comment.ParentId}"
                                    : "";
                    string url = $"/learn/learning.html?id={comment.Lesson.CourseModelId}&lessonId={comment.LessonId}{parentQuery}#comment-{comment.Id}";

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
        public async Task HardDeleteAsync(int id)
        {
            var entity = await _commentRepository.GetCommentByIdAsync(id);
            if (entity == null)
                throw new Exception("Bình luận không tồn tại");
            await _commentRepository.HardDeleteAsync(entity);
        }
        public async Task<object> GetParentCommentsPaginatedAsync(int lessonId, int userId, int page, int pageSize)
        {
            var course = await _courseRepository.GetByLessonId(lessonId);
            var (comments, totalCount) = await _commentRepository.GetParentCommentsAsync(lessonId, userId, page, pageSize);

            var response = MapToDTO(comments, course?.TeacherId);
            return new { data = response, total = totalCount };
        }
        public async Task<object> GetRepliesPaginatedAsync(int parentId, int lessonId, int userId, int page, int pageSize)
        {
            var course = await _courseRepository.GetByLessonId(lessonId);
            int? teacherId = course?.TeacherId;
            var (comments, totalCount) = await _commentRepository.GetRepliesAsync(parentId, userId, page, pageSize);
            var response = MapToDTO(comments, teacherId);
            return new { data = response, total = totalCount };
        }
        private List<CommentResponseDTO> MapToDTO(List<CommentModel> comments, int? teacherId)
        {
            return comments.Select(c => new CommentResponseDTO
            {
                Id = c.Id,
                Content = c.Content,
                UserId = c.UserId,
                UserFullName = c.User?.FullName ?? "Người dùng LMS",
                UserAvatar = c.User?.AvatarUrl ?? "/assets/img/default-avatar.png",
                CreatedAt = c.CreatedAt,
                ParentId = c.ParentId,
                IsPinned = c.IsPinned,
                TopReactionTypes = c.TopReactionTypes,
                ReplyCount = c.Replies?.Count(r => !r.IsDeleted && r.IsActive) ?? 0, // Đếm tổng reply
                TotalReactions = c.TotalReactions,
                IsLiked = c.IsLiked,
                ReactionType = c.UserReaction != null ? (int)c.UserReaction : 0,
                ReactionStats = c.ReactionStats,
                IsTeacher = teacherId.HasValue && c.UserId == teacherId.Value
            }).ToList();
        }
        public async Task<CommentStatsDto> GetAdminCommentStatsAsync(int? teacherId, int? courseId, int? lessonId)
        {
            var total = await _commentRepository.GetTotalCommentsAsync(teacherId, courseId, lessonId);
            var rawStats = await _commentRepository.GetCommentStatsLast7DaysAsync(teacherId, courseId, lessonId);

            var last7DaysCount = new List<int>();

            for (int i = 6; i >= 0; i--)
            {
                var targetDate = DateTime.Today.AddDays(-i);
                if (rawStats.TryGetValue(targetDate, out int count))
                {
                    last7DaysCount.Add(count);
                }
                else
                {
                    last7DaysCount.Add(0);
                }
            }

            return new CommentStatsDto
            {
                TotalComments = total,
                Last7DaysCount = last7DaysCount,
                AveragePerDay = last7DaysCount.Any() ? last7DaysCount.Average() : 0
            };
        }
    }
}
