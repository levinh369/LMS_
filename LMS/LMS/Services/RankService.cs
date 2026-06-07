using LMS.Data;
using LMS.DTOs;
using LMS.DTOs.Request;
using LMS.Enums;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Services
{
    public class RankService : IRankService
    {
        private readonly IRankRepository _rankRepo;
        private readonly ApplicationDbContext _context;

        public RankService(IRankRepository rankRepo, ApplicationDbContext context)
        {
            _rankRepo = rankRepo;
            _context = context;
        }
        public async Task<RankDashboardResponseDto> GetDashboardDataAsync()
        {
            var now = DateTime.Now;

            // 1. Lấy danh sách Rank và số lượng Teacher từng Rank
            var rankConfigs = await _rankRepo.GetRankConfigsWithTeacherCountAsync();

            // 2. Tính lợi nhuận sàn (Tháng này)
            // Lưu ý: Dùng (decimal?) để nếu tháng mới chưa có đơn nào thì trả về 0 thay vì báo lỗi Null
            var monthlyProfit = await _context.Orders
                .Where(o => o.Status == OrderStatusEnum.Success
                        && o.CreatedAt.Month == now.Month
                        && o.CreatedAt.Year == now.Year)
                .SumAsync(o => (decimal?)o.AdminAmount) ?? 0;

            // 3. Đếm tổng số giảng viên
            var totalTeachers = await _context.Users
                .CountAsync(u => u.Role.RoleName == "Teacher" && !u.IsDeleted);

            // 4. MỚI: Đếm số giảng viên mới đăng ký trong tháng này
            var newTeachersThisMonth = await _context.Users
                .CountAsync(u => u.Role.RoleName == "Teacher"
                        && !u.IsDeleted
                        && u.CreatedAt.Month == now.Month
                        && u.CreatedAt.Year == now.Year);

            // 5. MỚI: Tính tổng số giảng viên hạng Vàng + Kim Cương
            // Giả sử RankEnum của bác: 1=Đồng, 2=Bạc, 3=Vàng, 4=Kim Cương
            // Ta lấy luôn từ rankConfigs đã query ở trên cho nhẹ Database
            var vipTeachersCount = rankConfigs
                .Where(r => r.RankEnum >= 3) // Lọc các hạng VIP (Vàng trở lên)
                .Sum(r => r.TeacherCount);

            return new RankDashboardResponseDto
            {
                TotalTeachers = totalTeachers,
                MonthlyPlatformRevenue = monthlyProfit,
                VipTeachersCount = vipTeachersCount,
                NewTeachersThisMonth = newTeachersThisMonth,
                RankConfigs = rankConfigs
            };
        }
        public async Task<List<TeacherByRankDto>> GetTeachersByRankAsync(int rankEnum)
        {
            var teachers = await _rankRepo.GetTeachersByRankAsync(rankEnum);

            foreach (var teacher in teachers)
            {
                if (string.IsNullOrEmpty(teacher.AvatarUrl))
                {
                    teacher.AvatarUrl = "/assets/img/default-avatar.png";
                }
            }

            return teachers;
        }
        public async Task<bool> UpdateRankAsync(int id, RankRequestDTO rankRequest)
        {
            return await _rankRepo.UpdateRankAsync(id, rankRequest);
        }
    }
}
