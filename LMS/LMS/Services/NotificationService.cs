using LMS.DTOs.Request;
using LMS.Enums;
using LMS.Hub;
using LMS.Models;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace LMS.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notifRepo;
        private readonly IUserRepository userRepository;

        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationService(INotificationRepository notifRepo, IHubContext<NotificationHub> hubContext, IUserRepository userRepository)
        {
            _notifRepo = notifRepo;
            _hubContext = hubContext;
            this.userRepository = userRepository;
        }

     

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            return await _notifRepo.CountUnreadAsync(userId);
        }

        public async Task<List<NotificationModel>> GetUserNotificationsAsync(int userId,int skip = 0, int limit = 10)
        {
            return await _notifRepo.GetByUserIdAsync(userId, skip, limit);
        }

        public async Task MarkAllAsReadAsync(int userId)
        {
            await _notifRepo.MarkAllAsReadAsync(userId);
        }

        public async Task MarkAsReadAsync(int notificationId)
        {
            await _notifRepo.MarkAsReadAsync(notificationId);
        }

        public async Task SendNotificationAsync(int receiverId, int senderId, string message, NotificationTypeEnum type, string url, ReactionTypeEnum? reactionType = null)
        {
            // 1. Kiểm tra xem "thằng này" đã từng "làm chuyện đó" ở "chỗ này" chưa
            var existingNotif = await _notifRepo.CheckNotifExist(receiverId, senderId, type, url);

            if (existingNotif != null)
            {
                existingNotif.Message = message; 
                existingNotif.CreatedAt = DateTime.Now; 
                existingNotif.IsRead = false; 

                await _notifRepo.UpdateAsync(existingNotif);
            }
            else
            {
                // 3. NẾU CHƯA CÓ: Tạo mới hoàn toàn
                var notif = new NotificationModel
                {
                    UserId = receiverId,
                    SenderId = senderId,
                    Message = message,
                    Type = type,
                    RedirectUrl = url,
                    CreatedAt = DateTime.Now,
                    IsRead = false
                };
                await _notifRepo.AddAsync(notif);
            }
            var sender = await userRepository.GetByIdAsync(senderId);
            var unreadCount = await _notifRepo.CountUnreadAsync(receiverId);

            await _hubContext.Clients.User(receiverId.ToString()).SendAsync("ReceiveNotification", new
            {
                message = message,
                unreadCount = unreadCount,
                url = url,
                senderName = sender?.FullName ?? "Ai đó",
                senderAvatar = sender?.AvatarUrl ?? "",
                type = (int)type,
                reactionType = reactionType.HasValue ? (int)reactionType.Value : (int?)null,
                createdAt = DateTime.Now
            });
        }



    }
}
