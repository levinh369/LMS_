using LMS.DTOs.Request;
using LMS.Enums;
using LMS.Models;

namespace LMS.Services.Interfaces
{
    public interface INotificationService
    {
        // Gửi tbao + Lưu DB + Thổi SignalR
        Task SendNotificationAsync(int receiverId, int senderId, string message, NotificationTypeEnum type, string url, ReactionTypeEnum? reactionType);

        // Lấy danh sách để hiện lên Menu
        Task<List<NotificationModel>> GetUserNotificationsAsync(int userId, int skip =0, int limit = 20);

        // Đếm số để hiện Badge (chấm đỏ)
        Task<int> GetUnreadCountAsync(int userId);

        // Click vào tbao thì gọi hàm này
        Task MarkAsReadAsync(int notificationId);

        // Nút "Đọc tất cả"
        Task MarkAllAsReadAsync(int userId);
    }
}
