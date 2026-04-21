using LMS.Data;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class DashBoardRepository : IDashBoardRepository
    {
        private readonly ApplicationDbContext _context;
        public DashBoardRepository(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task<AdminDashboardDto> GetDashboardDataAsync(DateTime fromDate, DateTime toDate)
        {
            // 1. Lọc danh sách đơn hàng thành công trong khoảng thời gian
            var successfulOrders = await _context.Orders
                .Include(o => o.Course)
                .ThenInclude(c => c.Category) // Join sang Category để làm biểu đồ tròn
                .Where(o => o.Status == OrderStatusEnum.Success
                       && o.CreatedAt >= fromDate
                       && o.CreatedAt <= toDate)
                .ToListAsync();

            var dto = new AdminDashboardDto();

            // 2. Thẻ thống kê (Cards)
            dto.TotalRevenue = successfulOrders.Sum(o => o.Amount);
            dto.TotalOrders = successfulOrders.Count;
            // Đếm tổng User nhưng bỏ qua Admin và Giảng viên
            dto.TotalUsers = await _context.Users
                .Include(u => u.Role) // Nhớ Include bảng Role để filter theo tên
                .CountAsync(u => u.CreatedAt >= fromDate
                            && u.CreatedAt <= toDate
                            && u.RoleId != 1
                            && u.RoleId != 3);
            // Tỷ lệ hoàn thành bác có thể tính dựa trên bảng Progress (nếu có) hoặc fix tạm
            dto.CompletionRate = 75.5;

            // 3. Biểu đồ Doanh thu (Line Chart) - Group theo ngày
            var revenueGroup = successfulOrders
                .GroupBy(o => o.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .ToList();

            dto.RevenueLabels = revenueGroup.Select(g => g.Key.ToString("dd/MM")).ToList();
            dto.RevenueData = revenueGroup.Select(g => g.Sum(x => x.Amount)).ToList();

            // 4. Top 5 Khóa học bán chạy (Bar Chart)
            var topCourses = successfulOrders
                .GroupBy(o => o.Course.Title)
                .Select(g => new { Title = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToList();

            dto.CourseLabels = topCourses.Select(x => x.Title).ToList();
            dto.CourseData = topCourses.Select(x => x.Count).ToList();

            // 5. Phân bổ theo Danh mục (Pie Chart)
            var categoryDist = successfulOrders
                .GroupBy(o => o.Course.Category.Name)
                .Select(g => new { Name = g.Key, Count = g.Count() })
                .ToList();

            dto.CategoryLabels = categoryDist.Select(x => x.Name).ToList();
            dto.CategoryData = categoryDist.Select(x => x.Count).ToList();

            return dto;
        }
    }
}
