namespace LMS.Hub
{
    using LMS.Repositories.Interfaces;
    using LMS.Services;
    using LMS.Services.Interfaces;
    using Microsoft.AspNetCore.SignalR;
    using System.Collections.Concurrent;
    using System.Linq;
    using System.Threading.Tasks;
    using System;

    public class NotificationHub : Hub
    {
        private static readonly ConcurrentDictionary<string, int> _onlineUsers = new ConcurrentDictionary<string, int>();
        private readonly IDashboardService _stashboardService;

        public NotificationHub(IDashboardService dashboardService)
        {
            _stashboardService = dashboardService;
        }

        public override async Task OnConnectedAsync()
        {
            // 📍 1. PHÂN LUỒNG ADMIN: Thêm vào AdminGroup để hứng thông báo nhảy số (Chấm đỏ)
            // (Check cả "Admin" và "1" tùy vào cách bác cấu hình Claim trong Token)
            if (Context.User != null && (Context.User.IsInRole("Admin") || Context.User.IsInRole("1")))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "AdminGroup");
            }

            // 📍 2. PHÂN LUỒNG TEACHER: Code gốc của bác
            if (Context.User != null && Context.User.IsInRole("Teacher"))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "TeacherGroup");
            }

            var userId = Context.UserIdentifier;

            if (!string.IsNullOrEmpty(userId))
            {
                bool isFirstConnection = false;

                _onlineUsers.AddOrUpdate(userId, 1, (key, oldValue) =>
                {
                    if (oldValue == 0) isFirstConnection = true;
                    return oldValue + 1;
                });

                // LẤY TÊN VÀ AVATAR TỪ TOKEN RA
                var userName = Context.User?.Identity?.Name ?? "Học viên";
                var avatarUrl = Context.User?.Claims.FirstOrDefault(c => c.Type == "Avatar")?.Value
                                ?? "/images/default-avatar.png";

                if (isFirstConnection || _onlineUsers[userId] == 1)
                {
                    var onlineUserInfo = new
                    {
                        userId = userId,
                        userName = userName,
                        avatar = avatarUrl
                    };

                    await Clients.Group("TeacherGroup").SendAsync("UserIsOnline", onlineUserInfo);
                }
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.UserIdentifier ?? Context.User?.Identity?.Name;

            if (!string.IsNullOrEmpty(userId))
            {
                bool isOffline = false;

                _onlineUsers.AddOrUpdate(userId, 0, (key, oldValue) =>
                {
                    var newValue = oldValue - 1;
                    if (newValue <= 0) isOffline = true;
                    return newValue < 0 ? 0 : newValue;
                });

                if (isOffline)
                {
                    // Bắn tín hiệu offline cho TeacherGroup
                    await Clients.Group("TeacherGroup").SendAsync("UserIsOffline", userId);
                }
            }

            // 📍 3. DỌN DẸP KẾT NỐI: Xóa khỏi nhóm Admin khi họ tắt trình duyệt
            if (Context.User != null && (Context.User.IsInRole("Admin") || Context.User.IsInRole("1")))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, "AdminGroup");
            }

            if (Context.User != null && Context.User.IsInRole("Teacher"))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, "TeacherGroup");
            }

            await base.OnDisconnectedAsync(exception);
        }

        // HÀM LẤY DANH SÁCH ONLINE (Giữ nguyên code gốc của bác)
        public async Task<List<object>> GetActiveUsers(string? keySearch)
        {
            if (Context.User == null || !Context.User.IsInRole("Teacher"))
                return new List<object>();

            var currentTeacherIdStr = Context.UserIdentifier;

            var allOnlineIds = _onlineUsers
                .Where(x => x.Value > 0 && x.Key != currentTeacherIdStr)
                .Select(x => x.Key)
                .ToList();

            if (int.TryParse(currentTeacherIdStr, out int currentTeacherId))
            {
                return await _stashboardService.GetOnlineStudentsAsync(currentTeacherId, allOnlineIds, keySearch);
            }

            return new List<object>();
        }
    }
}