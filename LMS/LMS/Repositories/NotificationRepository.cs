using LMS.Data;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly ApplicationDbContext _context;
        public NotificationRepository(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task AddAsync(NotificationModel notification)
        {
            await _context.NotificationModels.AddAsync(notification);
            await _context.SaveChangesAsync();
        }
        public async Task UpdateAsync(NotificationModel notification)
        {
            _context.Entry(notification).State = EntityState.Modified;

            // Lưu thay đổi xuống Database
            await _context.SaveChangesAsync();
        }
        public async Task<NotificationModel?> CheckNotifExist(int userId, int senderId, NotificationTypeEnum type, string url)
        {
            return await _context.NotificationModels
                .FirstOrDefaultAsync(n => n.UserId == userId
                                      && n.SenderId == senderId
                                      && n.Type == type
                                      && n.RedirectUrl == url);
        }

        public async Task<int> CountUnreadAsync(int userId)
        {
            return await _context.NotificationModels.CountAsync(n => n.UserId == userId && !n.IsRead);
        }

        public async Task<List<NotificationModel>> GetByUserIdAsync(int userId, int skip = 0, int limit = 10)
        {
            return await _context.NotificationModels
                .AsNoTracking()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Skip(skip) // <--- THÊM DÒNG NÀY: Bỏ qua 'skip' bản ghi đầu tiên
                .Take(limit)
                .Select(n => new NotificationModel
                {
                    Id = n.Id,
                    Message = n.Message,
                    RedirectUrl = n.RedirectUrl,
                    Type = n.Type,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt,
                    SenderId = n.SenderId,
                    SenderAvatar = n.Sender != null ? n.Sender.AvatarUrl : null,

                    ReactionType = n.Type == NotificationTypeEnum.LikeComment
                        ? (int?)_context.CommentLikes
                            .Where(l => l.UserId == n.SenderId && n.RedirectUrl.Contains("comment-" + l.CommentId))
                            .Select(l => (int)l.Type) // Ép kiểu int luôn cho JS dễ dùng
                            .FirstOrDefault()
                        : null
                })
                .ToListAsync();
        }



        public async Task MarkAllAsReadAsync(int userId)
        {
            var unreadNotifs = await _context.NotificationModels
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

            foreach (var notif in unreadNotifs)
            {
                notif.IsRead = true;
            }
            await _context.SaveChangesAsync();
        }
        

        public async Task MarkAsReadAsync(int notificationId)
        {
            var notif = await _context.NotificationModels.FindAsync(notificationId);
            if (notif != null)
            {
                notif.IsRead = true;
                await _context.SaveChangesAsync();
            }
        }
    }
}
