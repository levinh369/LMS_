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

            // Kéo cả Tên và Số dư ví trong 1 lần gọi DB để tối ưu hệ thống
            var teacherInfo = await _context.Users
                .Where(u => u.Id == teacherId)
                .Select(u => new { u.FullName, u.WalletBalance })
                .FirstOrDefaultAsync();

            response.TeacherName = teacherInfo?.FullName ?? "Giảng viên";

            // 1. XỬ LÝ MỐC NGÀY MẶC ĐỊNH
            DateTime end = endDate ?? DateTime.UtcNow.Date;
            DateTime start = startDate ?? end.AddDays(-6);
            var endDateTime = end.AddDays(1).AddTicks(-1);

            // Khởi tạo các mảng danh sách trống tránh lỗi Client-side đọc thuộc tính null
            response.ChartLabels = new List<string>();
            response.WeeklyRevenue = new List<decimal>();
            response.CoursePerformances = new List<CoursePerformanceDTO>();
            response.RecentTransactions = new List<RecentTransactionDTO>();

            // 2. LẤY CÂU LỆNH CHỜ TỪ REPOSITORY
            var lifetimeQuery = _repo.GetEnrollmentsQuery()
                .Where(e => e.Course.TeacherId == teacherId);

            var periodQuery = _repo.GetEnrollmentsQueryByDate(start, endDateTime)
                .Where(e => e.Course.TeacherId == teacherId);

            decimal lifetimeGross = 0;
            bool hasAnyEnrollment = await lifetimeQuery.AnyAsync();
            if (hasAnyEnrollment)
            {
                lifetimeGross = await lifetimeQuery.SumAsync(e => e.Course.Price);
            }

            // ==========================================================
            // 3. THUẬT TOÁN XỬ LÝ HẠNG THÀNH VIÊN ĐỘNG TỪ DB (BỎ FIX CỨNG)
            // ==========================================================
            var activeRanks = await _context.Ranks
                .Where(r => r.IsActive == true && r.IsDeleted == false)
                .OrderBy(r => r.RequiredRevenue)
                .ToListAsync();

            // Nếu giảng viên mới tinh (doanh thu = 0), mặc định lấy phần tử đầu tiên (Hạng Đồng)
            var currentRank = activeRanks.LastOrDefault(r => lifetimeGross >= r.RequiredRevenue)
                              ?? activeRanks.FirstOrDefault();

            // Tìm rank kế tiếp (Hạng Bạc nếu doanh thu hiện tại bằng 0)
            var nextRank = activeRanks.FirstOrDefault(r => r.RequiredRevenue > lifetimeGross);

            // Lấy tỷ lệ hoa hồng trực tiếp từ cột DefaultRate trong DB của Rank hiện tại
            decimal commissionRate = currentRank != null ? currentRank.DefaultRate : 0;
            string rankName = currentRank?.RankName ?? "Đồng";
            string rankTitle = currentRank?.RankName ?? "Bronze Member";

            // Lấy mốc doanh thu yêu cầu của rank tiếp theo. Nếu rỗng (đạt max rank) hoặc DB chưa đồng bộ thì fallback 25 triệu
            decimal targetRevenue = nextRank?.RequiredRevenue
                                   ?? (activeRanks.Count > 1 ? activeRanks[1].RequiredRevenue : 25000000);

            string nextRankName = nextRank != null ? nextRank.RankName : "BẬC THẦY 👑";

            response.RankName = rankName;
            response.RankTitle = rankTitle;
            response.CommissionRate = commissionRate;
            response.CurrentRevenueForRank = lifetimeGross;
            response.TargetRevenueForRank = targetRevenue; // Trả về chuẩn mốc 25.000.000đ của Bạc
            response.NextRankName = nextRankName;
            response.AvailableBalance = teacherInfo?.WalletBalance ?? 0m;

            // CHẶN SỚM AN TOÀN: Nếu chưa có ai đăng ký học, trả về luôn DTO đã có đầy đủ thông tin Rank nền
            if (!hasAnyEnrollment)
            {
                response.RevenueChangeText = $"Báo cáo từ {start:dd/MM/yyyy} đến {end:dd/MM/yyyy} (Chưa có dữ liệu)";
                return response;
            }

            // ==========================================================
            // 4. TIẾP TỤC XỬ LÝ SỐ LIỆU THEO KỲ BÁO CÁO (KHI ĐA CÓ DATA)
            // ==========================================================
            decimal totalGrossInPeriod = await periodQuery.SumAsync(e => e.Course.Price);

            response.TotalGrossRevenue = totalGrossInPeriod;
            response.PlatformFee = totalGrossInPeriod * ((100 - commissionRate) / 100);
            response.NetRevenue = totalGrossInPeriod * (commissionRate / 100);
            response.RevenueChangeText = $"Báo cáo từ {start:dd/MM/yyyy} đến {end:dd/MM/yyyy}";

            // 5. XỬ LÝ BIỂU ĐỒ CỘT (BAR CHART)
            var revenueByDay = await periodQuery
                .GroupBy(e => e.CreatedAt.Date)
                .Select(g => new { Day = g.Key, Total = g.Sum(e => e.Course.Price) })
                .ToDictionaryAsync(x => x.Day, x => x.Total);

            for (var date = start.Date; date <= end.Date; date = date.AddDays(1))
            {
                response.ChartLabels.Add(date.ToString("dd/MM"));
                response.WeeklyRevenue.Add(revenueByDay.TryGetValue(date, out decimal dayTotal) ? dayTotal : 0);
            }

            // 6. THỐNG KÊ TIẾN ĐỘ HỌC TẬP (DONUT CHART)
            response.TotalStudentsCount = await lifetimeQuery.CountAsync();
            int completedCount = await lifetimeQuery.CountAsync(e => e.ProgressPercent == 100);
            int learningCount = await lifetimeQuery.CountAsync(e => e.ProgressPercent > 0 && e.ProgressPercent < 100);
            int notStartedCount = await lifetimeQuery.CountAsync(e => e.ProgressPercent == 0);

            response.CompletedPercentage = response.TotalStudentsCount > 0 ? (completedCount * 100 / response.TotalStudentsCount) : 0;
            response.LearningPercentage = response.TotalStudentsCount > 0 ? (learningCount * 100 / response.TotalStudentsCount) : 0;
            response.NotStartedPercentage = response.TotalStudentsCount > 0 ? (notStartedCount * 100 / response.TotalStudentsCount) : 0;

            // 7. ĐỔ DỮ LIỆU HIỆU SUẤT TỪNG KHÓA HỌC
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

            // 8. DANH SÁCH GIAO DỊCH GẦN NHẤT
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
        public async Task<PendingCountsDto> GetPendingCountsAsync()
        {
            // Đếm số đơn chờ duyệt trong DB (Status = 0)
            var withdrawCount = await _context.WithdrawalRequests.CountAsync(x => x.Status == 0);
            var teacherCount = await _context.InstructorApplications.CountAsync(x => x.Status == 0);

            return new PendingCountsDto
            {
                WithdrawCount = withdrawCount,
                TeacherCount = teacherCount
            };
        }
    }
}
