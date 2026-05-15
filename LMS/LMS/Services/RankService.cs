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
            var rankConfigs = await _rankRepo.GetRankConfigsWithTeacherCountAsync();
            var monthlyProfit = await _context.Orders
                .Where(o => o.Status == OrderStatusEnum.Success
                       && o.CreatedAt.Month == now.Month
                       && o.CreatedAt.Year == now.Year)
                .SumAsync(o => o.AdminAmount);
            var totalTeachers = await _context.Users
                .CountAsync(u => u.Role.RoleName == "Teacher" && !u.IsDeleted);
            var pendingRequests = await _context.Users
                .CountAsync(u => u.Role.RoleName == "Teacher" && u.IsActive == false);

            return new RankDashboardResponseDto
            {
                TotalTeachers = totalTeachers,
                MonthlyPlatformRevenue = monthlyProfit,
                AverageCommission = rankConfigs.Any() ? rankConfigs.Average(c => (decimal)c.DefaultRate) : 0,
                PendingRankRequests = pendingRequests,
                RankConfigs = rankConfigs,
                IsAutoRankingEnabled = true 
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
