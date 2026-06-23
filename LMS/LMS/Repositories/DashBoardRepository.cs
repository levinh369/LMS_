using LMS.Data;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
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

            // Khởi tạo danh sách trống tránh lỗi Client-side nhận mảng null
            dto.RevenueLabels = new List<string>();
            dto.RevenueData = new List<decimal>();
            dto.CourseLabels = new List<string>();
            dto.CourseData = new List<int>();
            dto.CategoryLabels = new List<string>();
            dto.CategoryData = new List<int>();

            // 2. Thẻ thống kê (Cards) - Nếu rỗng thì mặc định là 0
            dto.TotalRevenue = successfulOrders.Any() ? successfulOrders.Sum(o => o.Amount) : 0;
            dto.TotalOrders = successfulOrders.Count;

            // Đếm tổng User hoạt động (Bảng này đã có data nên chạy an toàn)
            dto.TotalUsers = await _context.Users
                .Include(u => u.Role)
                .CountAsync(u => u.CreatedAt >= fromDate
                             && u.CreatedAt <= toDate
                             && u.RoleId != 1
                             && u.RoleId != 3);

            dto.CompletionRate = 75.5;

            // KIỂM TRA: Nếu không có đơn hàng nào thì return luôn DTO trống, né lỗi 500 khi GroupBy
            if (!successfulOrders.Any())
            {
                return dto;
            }

            // 3. Biểu đồ Doanh thu (Line Chart) - Chỉ Group khi có data
            var revenueGroup = successfulOrders
                .Where(o => o.CreatedAt != null)
                .GroupBy(o => o.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .ToList();

            dto.RevenueLabels = revenueGroup.Select(g => g.Key.ToString("dd/MM")).ToList();
            dto.RevenueData = revenueGroup.Select(g => g.Sum(x => x.Amount)).ToList();

            // 4. Top 5 Khóa học bán chạy (Bar Chart) - Thêm kiểm tra điều hướng rỗng `?`
            var topCourses = successfulOrders
                .Where(o => o.Course != null)
                .GroupBy(o => o.Course.Title)
                .Select(g => new { Title = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToList();

            dto.CourseLabels = topCourses.Select(x => x.Title).ToList();
            dto.CourseData = topCourses.Select(x => x.Count).ToList();

            // 5. Phân bổ theo Danh mục (Pie Chart) - Thêm kiểm tra điều hướng rỗng `?`
            var categoryDist = successfulOrders
                .Where(o => o.Course != null && o.Course.Category != null)
                .GroupBy(o => o.Course.Category.Name)
                .Select(g => new { Name = g.Key, Count = g.Count() })
                .ToList();

            dto.CategoryLabels = categoryDist.Select(x => x.Name).ToList();
            dto.CategoryData = categoryDist.Select(x => x.Count).ToList();

            return dto;
        }
        public IQueryable<EnrollmentModel> GetEnrollmentsQuery()
        {
            return _context.Enrollments
                .AsNoTracking();
        }

 
        public IQueryable<EnrollmentModel> GetEnrollmentsQueryByDate(DateTime startDate, DateTime endDate)
        {
            return _context.Enrollments
                .AsNoTracking()
                .Where(e => e.CreatedAt >= startDate && e.CreatedAt <= endDate);
        }

        public IQueryable<EnrollmentModel> FilterMyStudentsQuery(int teacherId, List<string> onlineUserIds, string? keySearch = null)
        {
            var onlineUserIdsInt = onlineUserIds
                .Where(id => int.TryParse(id, out _))
                .Select(int.Parse)
                .ToList();

            var query = _context.Enrollments
                .AsNoTracking()
                .Where(e => e.Course.TeacherId == teacherId && onlineUserIdsInt.Contains(e.UserId));

            if (!string.IsNullOrEmpty(keySearch))
            {
                string search = keySearch.ToLower().Trim();
                // THÊM: e.User.FullName != null để chặn đứng lỗi Null Reference dưới SQL
                query = query.Where(e => e.User.FullName != null && e.User.FullName.ToLower().Contains(search));
            }

            return query;
        }
    }
}
