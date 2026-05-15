namespace LMS.Hub
{
    using LMS.Repositories.Interfaces;
    using LMS.Services;
    using LMS.Services.Interfaces;
    using Microsoft.AspNetCore.SignalR;
    using System.Collections.Concurrent;

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
            // 1. Chỉ Teacher mới được vào nhóm nhận thông báo
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

                // 2. LẤY TÊN VÀ AVATAR TỪ TOKEN RA
                // Vì lúc tạo Token bạn dùng ClaimTypes.Name, nên Identity.Name sẽ tự động lấy được FullName
                var userName = Context.User?.Identity?.Name ?? "Học viên";

                // Lấy Claim có Type là "Avatar" mà mình vừa tự định nghĩa
                var avatarUrl = Context.User?.Claims.FirstOrDefault(c => c.Type == "Avatar")?.Value
                                ?? "/images/default-avatar.png"; // Nếu không có thì gán ảnh mặc định

                if (isFirstConnection || _onlineUsers[userId] == 1)
                {
                    // 3. GÓI VÀO OBJECT GỬI XUỐNG JS
                    var onlineUserInfo = new
                    {
                        userId = userId,
                        userName = userName,
                        avatar = avatarUrl // <--- Đã thêm Avatar vào gói hàng!
                    };

                    await Clients.Group("TeacherGroup").SendAsync("UserIsOnline", onlineUserInfo);
                }
            }

            await base.OnConnectedAsync();
        }
        public override async Task OnDisconnectedAsync(Exception exception)
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
                    // Thoát thì chỉ cần bắn mỗi ID xuống để JS tìm thẻ HTML xóa đi là được
                    await Clients.Group("TeacherGroup").SendAsync("UserIsOffline", userId);
                }
            }

            if (Context.User != null && Context.User.IsInRole("Teacher"))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, "TeacherGroup");
            }

            await base.OnDisconnectedAsync(exception);
        }
        public async Task<List<object>> GetActiveUsers(string? keySearch)
        {
            if (Context.User == null || !Context.User.IsInRole("Teacher"))
                return new List<object>();

            var currentTeacherIdStr = Context.UserIdentifier;

            // Lấy danh sách các ID đang có kết nối lớn hơn 0
            var allOnlineIds = _onlineUsers.Where(x => x.Value > 0).Select(x => x.Key).ToList();

            if (int.TryParse(currentTeacherIdStr, out int currentTeacherId))
            {
                // Gọi thẳng qua tầng Service xử lý
                return await _stashboardService.GetOnlineStudentsAsync(currentTeacherId, allOnlineIds, keySearch);
            }

            return new List<object>();
        }
    }
}

