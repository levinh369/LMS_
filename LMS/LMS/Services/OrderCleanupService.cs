using LMS.Data;
using LMS.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace LMS.Services 
{
    public class OrderCleanupService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public OrderCleanupService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Vòng lặp này sẽ chạy liên tục chừng nào web còn hoạt động
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                        // 1. Lấy giờ hiện tại (Xử lý múi giờ VN như code cũ của bác)
                        DateTime nowInVietnam;
                        try
                        {
                            nowInVietnam = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"));
                        }
                        catch
                        {
                            nowInVietnam = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"));
                        }

                        // 2. Tính mốc thời gian 15 phút trước
                        var expiredTime = nowInVietnam.AddMinutes(-15);

                        // 3. Tìm các đơn hàng Pending được tạo trước cái mốc 15 phút đó
                        var expiredOrders = await context.Orders
                            .Where(o => o.Status == OrderStatusEnum.Pending && o.CreatedAt < expiredTime)
                            .ToListAsync(stoppingToken);

                        if (expiredOrders.Any())
                        {
                            // Đổi trạng thái sang Hủy
                            foreach (var order in expiredOrders)
                            {
                                order.Status = OrderStatusEnum.Cancelled;
                            }

                            await context.SaveChangesAsync(stoppingToken);
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Ghi log lỗi nếu có để web không bị chết ngầm
                    Console.WriteLine($"Lỗi khi dọn dẹp đơn hàng: {ex.Message}");
                }

                // 4. Cho luồng này "ngủ" 5 phút rồi mới thức dậy quét tiếp
                // Không nên để chạy liên tục từng giây sẽ tốn CPU của máy chủ Render
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }
    }
}