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
            var orderData = await _context.Orders
                .Where(o => o.Status == OrderStatusEnum.Success
                         && o.CreatedAt >= fromDate
                         && o.CreatedAt <= toDate)
                .Select(o => new
                {
                    Amount = o.Amount,
                    CreatedAt = o.CreatedAt,
                    CourseTitle = o.Course != null ? o.Course.Title : "Khóa học đã bị xóa",
                    CategoryName = (o.Course != null && o.Course.Category != null) ? o.Course.Category.Name : "Chưa phân loại"
                })
                .ToListAsync();

            var dto = new AdminDashboardDto();
            dto.RevenueLabels = new List<string>();
            dto.RevenueData = new List<decimal>();
            dto.CourseLabels = new List<string>();
            dto.CourseData = new List<int>();
            dto.CategoryLabels = new List<string>();
            dto.CategoryData = new List<int>();

            // 2. Thẻ thống kê (Cards)
            dto.TotalRevenue = orderData.Any() ? orderData.Sum(o => o.Amount) : 0;
            dto.TotalOrders = orderData.Count;

            // Đếm tổng User hoạt động
            dto.TotalUsers = await _context.Users
                .CountAsync(u => u.CreatedAt >= fromDate
                              && u.CreatedAt <= toDate
                              && u.RoleId != 1
                              && u.RoleId != 3);

            double completedLessons = await _context.UsersProgress
                .CountAsync(up => up.IsCompleted
                               && up.UpdatedAt >= fromDate
                               && up.UpdatedAt <= toDate);

            double totalLessons = await _context.Enrollments
                .Where(e => e.CreatedAt >= fromDate && e.CreatedAt <= toDate)
                .Join(_context.Lessons,
                      enroll => enroll.CourseId,
                      lesson => lesson.Chapter.CourseId, 
                      (enroll, lesson) => lesson)
                .CountAsync();

            dto.CompletionRate = totalLessons > 0
                ? Math.Round((completedLessons / totalLessons) * 100, 1)
                : 0;
            if (!orderData.Any())
            {
                return dto;
            }

            var revenueGroup = orderData
                .GroupBy(o => o.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .ToList();

            dto.RevenueLabels = revenueGroup.Select(g => g.Key.ToString("dd/MM")).ToList();
            dto.RevenueData = revenueGroup.Select(g => g.Sum(x => x.Amount)).ToList();
            var topCourses = orderData
                .GroupBy(o => o.CourseTitle)
                .Select(g => new { Title = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToList();

            dto.CourseLabels = topCourses.Select(x => x.Title).ToList();
            dto.CourseData = topCourses.Select(x => x.Count).ToList();

  
            var categoryDist = orderData
                .GroupBy(o => o.CategoryName)
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
