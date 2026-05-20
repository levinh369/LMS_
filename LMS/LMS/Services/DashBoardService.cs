using LMS.Data;
using LMS.DTOs.Respone;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly IDashBoardRepository _repo;
        private readonly ApplicationDbContext _context;
        public DashboardService(IDashBoardRepository repo, ApplicationDbContext applicationDb) 
        { 
            _repo = repo;
            _context = applicationDb;
        }

        public async Task<AdminDashboardDto> GetAdminDashboardData(DateTime fromDate, DateTime toDate)
        {
            if (fromDate > toDate) (fromDate, toDate) = (toDate, fromDate);
            return await _repo.GetDashboardDataAsync(fromDate, toDate);
        }
        public async Task<TeacherDashboardResponseDTO> GetDashboardDataAsync(int teacherId, DateTime? startDate, DateTime? endDate)
        {
            var response = new TeacherDashboardResponseDTO();

            // SỬA LẠI TẠI ĐÂY: Kéo cả Tên và Số dư ví (WalletBalance) trong 1 lần gọi DB
            var teacherInfo = await _context.Users
                .Where(u => u.Id == teacherId)
                .Select(u => new { u.FullName, u.WalletBalance })
                .FirstOrDefaultAsync();

            response.TeacherName = teacherInfo?.FullName ?? "Giảng viên";

            // 1. XỬ LÝ MỐC NGÀY MẶC ĐỊNH
            DateTime end = endDate ?? DateTime.UtcNow.Date;
            DateTime start = startDate ?? end.AddDays(-6);
            var endDateTime = end.AddDays(1).AddTicks(-1);

            // 2. LẤY CÂU LỆNH CHỜ (IQUERYABLE) TỪ REPOSITORY
            var lifetimeQuery = _repo.GetEnrollmentsQuery()
                .Where(e => e.Course.TeacherId == teacherId);

            var periodQuery = _repo.GetEnrollmentsQueryByDate(start, endDateTime)
                .Where(e => e.Course.TeacherId == teacherId);

            bool hasAnyEnrollment = await lifetimeQuery.AnyAsync();
            if (!hasAnyEnrollment)
            {
                response.RevenueChangeText = $"Báo cáo từ {start:dd/MM/yyyy} đến {end:dd/MM/yyyy} (Chưa có dữ liệu)";
                // Vẫn phải trả về số dư ví kể cả khi chưa có học viên nào mua
                response.AvailableBalance = teacherInfo?.WalletBalance ?? 0m;
                return response;
            }

            // 3. TÍNH TOÁN DOANH THU ĐẨY THẲNG XUỐNG SQL SERVER
            decimal lifetimeGross = await lifetimeQuery.SumAsync(e => e.Course.Price);
            decimal totalGrossInPeriod = await periodQuery.SumAsync(e => e.Course.Price);

            // ==========================================================
            // 4. THUẬT TOÁN XỬ LÝ HẠNG THÀNH VIÊN ĐỘNG TỪ DATABASE (MỚI)
            // ==========================================================
            var activeRanks = await _context.Ranks
                .Where(r => r.IsActive == true && r.IsDeleted == false)
                .OrderBy(r => r.RequiredRevenue)
                .ToListAsync();

            var currentRank = activeRanks.LastOrDefault(r => lifetimeGross >= r.RequiredRevenue)
                              ?? activeRanks.FirstOrDefault();

            var nextRank = activeRanks.FirstOrDefault(r => r.RequiredRevenue > lifetimeGross);

            decimal commissionRate = currentRank?.DefaultRate ?? 70;
            string rankName = currentRank?.RankName ?? "HẠNG ĐỒNG";
            string rankTitle = currentRank?.RankName ?? "Bronze Member";

            decimal targetRevenue = nextRank?.RequiredRevenue ?? lifetimeGross;
            string nextRankName = nextRank != null ? nextRank.RankName : "BẬC THẦY 👑";

            response.RankName = rankName;
            response.RankTitle = rankTitle;
            response.CommissionRate = commissionRate;
            response.CurrentRevenueForRank = lifetimeGross;
            response.TargetRevenueForRank = targetRevenue;
            response.NextRankName = nextRankName;

            // ==========================================================
            // 5. PHÂN BỔ CÁC THỂ SỐ LIỆU TÀI CHÍNH THEO KỲ BÁO CÁO (ĐỘNG)
            // ==========================================================
            response.TotalGrossRevenue = totalGrossInPeriod;
            response.PlatformFee = totalGrossInPeriod * ((100 - commissionRate) / 100);
            response.NetRevenue = totalGrossInPeriod * (commissionRate / 100);

            // FIX TẠI ĐÂY: Gán cố định bằng số dư ví thực tế lấy từ DB ở đầu hàm
            response.AvailableBalance = teacherInfo?.WalletBalance ?? 0m;

            response.RevenueChangeText = $"Báo cáo từ {start:dd/MM/yyyy} đến {end:dd/MM/yyyy}";

            // 6. XỬ LÝ TRỤC NGÀY ĐỘNG CHO BIỂU ĐỒ CỘT (BAR CHART)
            var revenueByDay = await periodQuery
                .GroupBy(e => e.CreatedAt.Date)
                .Select(g => new { Day = g.Key, Total = g.Sum(e => e.Course.Price) })
                .ToDictionaryAsync(x => x.Day, x => x.Total);

            var chartLabels = new List<string>();
            var chartData = new List<decimal>();

            for (var date = start.Date; date <= end.Date; date = date.AddDays(1))
            {
                chartLabels.Add(date.ToString("dd/MM"));
                chartData.Add(revenueByDay.TryGetValue(date, out decimal dayTotal) ? dayTotal : 0);
            }
            response.ChartLabels = chartLabels;
            response.WeeklyRevenue = chartData;

            // 7. THỐNG KÊ TIẾN ĐỘ HỌC TẬP (DONUT CHART)
            response.TotalStudentsCount = await lifetimeQuery.CountAsync();
            int completedCount = await lifetimeQuery.CountAsync(e => e.ProgressPercent == 100);
            int learningCount = await lifetimeQuery.CountAsync(e => e.ProgressPercent > 0 && e.ProgressPercent < 100);
            int notStartedCount = await lifetimeQuery.CountAsync(e => e.ProgressPercent == 0);

            response.CompletedPercentage = response.TotalStudentsCount > 0 ? (completedCount * 100 / response.TotalStudentsCount) : 0;
            response.LearningPercentage = response.TotalStudentsCount > 0 ? (learningCount * 100 / response.TotalStudentsCount) : 0;
            response.NotStartedPercentage = response.TotalStudentsCount > 0 ? (notStartedCount * 100 / response.TotalStudentsCount) : 0;

            // 8. ĐỔ DỮ LIỆU HIỆU SUẤT TỪNG KHÓA HỌC (ĂN THEO HOA HỒNG ĐỘNG)
            response.CoursePerformances = await periodQuery
                .GroupBy(e => e.CourseId)
                .Select(g => new CoursePerformanceDTO
                {
                    CourseName = g.First().Course.Title,
                    IsPro = g.First().Course.Price > 0,
                    StudentCount = g.Count(),
                    GrossRevenue = g.Sum(e => e.Course.Price),
                    NetRevenue = g.Sum(e => e.Course.Price) * (commissionRate / 100)
                })
                .ToListAsync();

            // 9. DANH SÁCH GIAO DỊCH GẦN NHẤT (ĂN THEO HOA HỒNG ĐỘNG)
            response.RecentTransactions = await periodQuery
                .OrderByDescending(e => e.CreatedAt)
                .Take(3)
                .Select(e => new RecentTransactionDTO
                {
                    Description = $"Học viên: {e.User.FullName}",
                    Amount = e.Course.Price * (commissionRate / 100),
                    IsIncome = true
                })
                .ToListAsync();

            return response;
        }
        public async Task<List<object>> GetOnlineStudentsAsync(int teacherId, List<string> onlineUserIds, string? keySearch = null)
        {
            // 1. Gọi Repo lấy câu lệnh Query chờ dưới dạng IQueryable (Giữ nguyên)
            var query = _repo.FilterMyStudentsQuery(teacherId, onlineUserIds, keySearch);

            // 2. SỬA TẠI ĐÂY: Bỏ chữ <object> đi để EF Core kéo mảng nặc danh về RAM thành công
            var onlineStudentsRaw = await query
                .Select(e => new
                {
                    userId = e.UserId.ToString(),
                    userName = e.User.FullName,
                    avatar = e.User.AvatarUrl ?? "/images/default-avatar.png"
                })
                .Distinct()
                .ToListAsync(); // Để trống chỗ này, SQL Server xử lý xong sẽ trả data về RAM

            // 3. Ép kiểu trên bộ nhớ RAM sang List<object> để khớp định dạng đầu ra trả về cho Hub
            return onlineStudentsRaw.Cast<object>().ToList();
        }
    }
}
