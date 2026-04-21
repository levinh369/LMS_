using LMS.Data;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class CommentRepository : ICommentRepository
    {
        private readonly ApplicationDbContext _context;
        public CommentRepository(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task AddAsync(CommentModel comment)
        {
            comment.UpdatedAt = DateTime.Now;
            comment.CreatedAt = DateTime.Now;
            await _context.Comments.AddAsync(comment);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id, int userId)
        {
            var comment = await _context.Comments
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
            if (comment != null)
            {
                comment.IsDeleted = true;
                comment.UpdatedAt = DateTime.Now;
                await _context.SaveChangesAsync();
            }
        }
        public async Task<CommentLikeModel?> GetReactionAsync(int commentId, int userId)
        {
            return await _context.CommentLikes
        .AsNoTracking()
        .FirstOrDefaultAsync(l => l.CommentId == commentId && l.UserId == userId);
        }

        public async Task<int> GetLikeCountAsync(int commentId)
        {
            return await _context.Comments
                .Where(c => c.Id == commentId)
                .Select(c => c.LikeCount)
                .FirstOrDefaultAsync();
        }

        public async Task<List<CommentModel>> GetByComment(int lessonId, int userId)
        {
            // 1. Lấy danh sách Comment kèm theo User và toàn bộ lượt Likes
            var comments = await _context.Comments
           .Include(c => c.User) // User của comment hiện tại
           .Include(c => c.ParentComment) // Thằng cha của comment hiện tại
               .ThenInclude(p => p.User) // User của thằng cha đó (Để lấy tên @)
           .Include(c => c.Likes)
           .Where(c => c.LessonId == lessonId && !c.IsDeleted)
           .OrderByDescending(c => c.CreatedAt)
           .ToListAsync();

            // 2. Duyệt qua từng comment để tính toán "siêu dữ liệu"
            foreach (var comment in comments)
            {
                // Tính tổng số lượng cảm xúc
                comment.TotalReactions = comment.Likes.Count;

                // Thống kê chi tiết: Có bao nhiêu Like, bao nhiêu Haha...
                // Lấy TẤT CẢ (không Take 3 ở đây) để Frontend hover hiện đầy đủ
                comment.ReactionStats = comment.Likes
                    .GroupBy(l => l.Type)
                    .Select(g => new ReactionStatDTO
                    {
                        Type = (int)g.Key,
                        Count = g.Count()
                    })
                    .OrderByDescending(x => x.Count) // Thằng nào nhiều nhất xếp lên đầu
                    .ToList();
                if (userId > 0)
                {
                    var myReaction = comment.Likes.FirstOrDefault(l => l.UserId == userId);
                    if (myReaction != null)
                    {
                        comment.IsLiked = true;
                        comment.UserReaction = myReaction.Type;
                    }
                    else
                    {
                        comment.IsLiked = false;
                        comment.UserReaction = null;
                    }
                }
            }

            return comments;
        }
        public async Task<ReactionResultDTO> HandleReactionAsync(int userId, int commentId, ReactionTypeEnum type)
        {
            // 1. Tìm comment (Không cần Include Likes ở đây để nhẹ máy)
            var comment = await _context.Comments.FindAsync(commentId);
            if (comment == null) return null;

            // 2. Tìm lượt like cũ trực tiếp từ bảng Likes
            var existingLike = await _context.CommentLikes
                .FirstOrDefaultAsync(l => l.UserId == userId && l.CommentId == commentId);

            bool isLikedNow = false;
            ReactionTypeEnum finalType = ReactionTypeEnum.None;

            // --- LOGIC XỬ LÝ DATABASE ---
            if (existingLike != null)
            {
                if (existingLike.Type == type)
                {
                    _context.CommentLikes.Remove(existingLike);
                    isLikedNow = false;
                }
                else
                {
                    existingLike.Type = type;
                    existingLike.LikedAt = DateTime.Now;
                    isLikedNow = true;
                    finalType = type;
                }
            }
            else
            {
                _context.CommentLikes.Add(new CommentLikeModel
                {
                    UserId = userId,
                    CommentId = commentId,
                    Type = type,
                    LikedAt = DateTime.Now
                });
                isLikedNow = true;
                finalType = type;
            }

            // LƯU XUỐNG DB TRƯỚC (Để đảm bảo DB đã được cập nhật xong xuôi)
            await _context.SaveChangesAsync();

            // --- LOGIC TÍNH TOÁN LẠI (Lấy dữ liệu "tươi" nhất từ DB) ---
            var allLikes = await _context.CommentLikes
                .AsNoTracking() // Dùng cái này để lấy dữ liệu thực, không lấy qua cache RAM
                .Where(l => l.CommentId == commentId)
                .ToListAsync();

            var stats = allLikes
                .GroupBy(l => l.Type)
                .Select(g => new ReactionStatDTO
                {
                    Type = (int)g.Key,
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .ToList();

            // Cập nhật lại số lượng tổng vào bảng Comment cho đồng bộ
            comment.LikeCount = allLikes.Count;
            await _context.SaveChangesAsync();

            return new ReactionResultDTO
            {
                IsLiked = isLikedNow,
                ReactionType = (int)finalType,
                TotalReactions = allLikes.Count,
                TopReactionTypes = stats.Take(3).Select(s => s.Type).ToList(),
                ReactionStats = stats
            };
        }

        public async Task<List<CommentReactionDetailResponseDTO>> GetReactionDetailsAsync(int commentId)
        {
            return await _context.CommentLikes
                .Include(l => l.User)
                .Where(l => l.CommentId == commentId)
                .Select(l => new CommentReactionDetailResponseDTO
                {
                    UserId = l.UserId, // <--- Lấy thêm ID để làm link
                    UserFullName = l.User.FullName ?? "Học viên",
                    UserAvatar = l.User.AvatarUrl ?? "/assets/img/default-avatar.png",
                    ReactionType = (int)l.Type
                })
                .ToListAsync();
        }

        public async Task<bool> EditCommentAsync(int commentId, string newComment, int userId)
        {
            var comment = await _context.Comments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.UserId == userId);

            if (comment == null) return false;
            comment.Content = newComment.Trim();
            comment.UpdatedAt = DateTime.Now; 
            var result = await _context.SaveChangesAsync();
            return result > 0;
        }

        public async Task<bool> DeleteCommentAsync(int commentId, int userId)
        {

            var comment = await _context.Comments
                .FirstOrDefaultAsync(c => c.Id == commentId && c.UserId == userId);

            if (comment == null) return false;

            comment.IsDeleted = true;
            return await _context.SaveChangesAsync() > 0;
        }
        public async Task DeleteReactionAsync(CommentLikeModel like)
        {
            _context.CommentLikes.Remove(like);
            await _context.SaveChangesAsync();
        }
        public async Task AddReactionAsync(CommentLikeModel like)
        {
            await _context.CommentLikes.AddAsync(like);
            await _context.SaveChangesAsync();
        }
        public async Task<CommentModel?> GetCommentByIdAsync(int id)
        {
            return await _context.Comments
                .Include(c => c.Lesson) 
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id);
        }


        public async Task<bool> ToggleHideCommentAsync(int id)
        {
            var comment = await _context.Comments.FindAsync(id);
            if (comment == null) return false;
            comment.IsActive = !comment.IsActive;

            return await _context.SaveChangesAsync() > 0;
        }

        // 1. LẤY DANH SÁCH (Fix logic lọc để hiện cả con bị xóa lẻ)
        public async Task<(List<AdminCommentResponseDTO> Items, int TotalCount)> GetAdminCommentsAsync(
     int pageIndex, int? courseId, int? lessonId, string? search, string status) // Thêm lessonId ở đây
        {
            int pageSize = 5;
            IQueryable<CommentModel> query;

            if (status == "trash")
            {
                query = _context.Comments.Where(c => c.IsDeleted && (c.ParentId == null || c.ParentComment.IsDeleted == false));
            }
            else
            {
                query = _context.Comments.Where(c => !c.IsDeleted && c.ParentId == null);
            }

            // --- BỘ LỌC KHÓA HỌC ---
            if (courseId.HasValue && courseId.Value > 0)
            {
                query = query.Where(c => c.Lesson.Chapter.CourseId == courseId.Value);
            }

            // --- BỘ LỌC BÀI HỌC (Cái này bác đừng bỏ nhé!) ---
            if (lessonId.HasValue && lessonId.Value > 0)
            {
                query = query.Where(c => c.LessonId == lessonId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string searchLower = search.ToLower();
                query = query.Where(c => c.Content.ToLower().Contains(searchLower) || c.User.FullName.ToLower().Contains(searchLower));
            }

            int totalCount = await query.CountAsync();

            var items = await query
                .Include(c => c.User).ThenInclude(u => u.Role)
                .Include(c => c.Lesson).ThenInclude(l => l.Chapter).ThenInclude(ch => ch.Course)
                // SẮP XẾP: Ghim lên đầu, rồi mới đến ngày tạo
                .OrderByDescending(c => c.IsPinned)
                .ThenByDescending(c => c.CreatedAt)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new AdminCommentResponseDTO
                {
                    Id = c.Id,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt,
                    IsActive = c.IsActive,
                    IsDeleted = c.IsDeleted,
                    IsPinned = c.IsPinned, // PHẢI CÓ cái này để Frontend biết đường mà hiện Icon 📌
                    UserName = c.User.FullName,
                    UserAvatar = c.User.AvatarUrl,
                    LessonName = c.Lesson.Title,
                    LessonId = c.Lesson.Id,
                    CourseTitle = c.Lesson.Chapter.Course.Title,
                    IsAdmin = c.User.Role != null && c.User.Role.RoleName == "Admin",
                    CourseId = c.Lesson.Chapter.CourseId,
                    ParentId = c.ParentId,

                    Replies = c.Replies
                        .Where(r => r.IsDeleted == c.IsDeleted)
                        .OrderBy(r => r.CreatedAt)
                        .Select(r => new AdminCommentResponseDTO
                        {
                            Id = r.Id,
                            Content = r.Content,
                            CreatedAt = r.CreatedAt,
                            IsDeleted = r.IsDeleted,
                            IsActive = r.IsActive,
                            UserName = r.User.FullName,
                            UserAvatar = r.User.AvatarUrl,
                            IsAdmin = r.User.Role != null && r.User.Role.RoleName == "Admin",
                            ParentId = r.ParentId
                        }).ToList()
                })
                .ToListAsync();

            return (items, totalCount);
        }

        // 2. XÓA MỀM (Cascade - Thác nước)
        public async Task<bool> SoftDeleteAsync(int commentId)
        {
            var comment = await _context.Comments
                .Include(c => c.Replies)
                .FirstOrDefaultAsync(c => c.Id == commentId);

            if (comment == null) return false;

            comment.IsDeleted = true;
            comment.UpdatedAt = DateTime.Now;

            // Xóa luôn cả đám con
            if (comment.Replies != null)
            {
                foreach (var reply in comment.Replies)
                {
                    reply.IsDeleted = true;
                    reply.UpdatedAt = DateTime.Now;
                }
            }

            return await _context.SaveChangesAsync() > 0;
        }

        // 3. KHÔI PHỤC (Double-Side Restore)
        public async Task<bool> RestoreAsync(int commentId)
        {
            var comment = await _context.Comments
                .Include(c => c.ParentComment)
                .Include(c => c.Replies) // Nên Include thêm replies để khôi phục cả cụm
                .FirstOrDefaultAsync(c => c.Id == commentId);

            if (comment == null) return false;

            comment.IsDeleted = false;
            comment.UpdatedAt = DateTime.Now;

            // Nếu khôi phục con lẻ -> Khôi phục luôn cha (để nó có chỗ hiện ra)
            if (comment.ParentId != null && comment.ParentComment != null && comment.ParentComment.IsDeleted)
            {
                comment.ParentComment.IsDeleted = false;
            }

            // Nếu khôi phục cha -> Khôi phục luôn toàn bộ con cho đồng bộ
            if (comment.Replies != null)
            {
                foreach (var reply in comment.Replies)
                {
                    reply.IsDeleted = false;
                }
            }

            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<int> HandlePinLogicAsync(CommentModel model, bool isNew)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Tìm thằng đang được ghim trong bài học này (nếu có) để gỡ ghim
                var currentPin = await _context.Comments
                    .FirstOrDefaultAsync(c => c.LessonId == model.LessonId && c.IsPinned && !c.IsDeleted);

                if (currentPin != null)
                {
                    currentPin.IsPinned = false;
                }

                if (isNew)
                {
                    // 2a. Thêm comment mới và ghim luôn
                    model.IsPinned = true;
                    model.CreatedAt = DateTime.Now;
                    model.IsActive = true;
                    await _context.Comments.AddAsync(model);
                    await _context.SaveChangesAsync(); // Lưu để lấy ID mới
                }
                else
                {
                    // 2b. Tìm comment cũ và đánh dấu IsPinned = true
                    var existingComment = await _context.Comments.FindAsync(model.Id);
                    if (existingComment != null)
                    {
                        existingComment.IsPinned = true;
                        // Gán lại Id vào model để return phía dưới cho chuẩn
                        model.Id = existingComment.Id;
                    }
                    else
                    {
                        return 0; // Không tìm thấy comment để ghim
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return model.Id;
            }
            catch (Exception ex)
            {
                // Log lỗi ở đây nếu cần: console.WriteLine(ex.Message);
                await transaction.RollbackAsync();
                return 0;
            }
        }
    }
}
