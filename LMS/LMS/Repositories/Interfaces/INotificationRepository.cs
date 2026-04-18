using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace LMS.Repositories.Interfaces
{
    public interface INotificationRepository
    {
        Task AddAsync(NotificationModel notification);
        Task<List<NotificationModel>> GetByUserIdAsync(int userId,int skip =0, int limit = 10);
        Task<int> CountUnreadAsync(int userId);
        Task MarkAsReadAsync(int notificationId);
        Task MarkAllAsReadAsync(int userId);
        Task<NotificationModel?> CheckNotifExist(int userId, int senderId, NotificationTypeEnum type, string url);
        Task UpdateAsync(NotificationModel notification);
       

    }
}
