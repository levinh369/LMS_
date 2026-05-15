using LMS.Data;
using LMS.DTOs;
using LMS.DTOs.Request;
using LMS.Enums;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class RankRepository : IRankRepository
    {
        private readonly ApplicationDbContext _context;
        public RankRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<RankConfigItemDto>> GetRankConfigsWithTeacherCountAsync()
        {
            return await _context.Ranks
                .Where(r => !r.IsDeleted)
                .Select(r => new RankConfigItemDto
                {
                    RankId = r.Id,
                    RankName = r.RankName,
                    RankEnum = (int)r.RankEnum,
                    RequiredRevenue = r.RequiredRevenue,
                    DefaultRate = r.DefaultRate,
                    // Đếm số lượng Teacher đang ở hạng này
                    TeacherCount = _context.Users.Count(u => u.Role.RoleName == "Teacher" && u.Rank == r.RankEnum)
                })
                .OrderBy(x => x.RankEnum)
                .ToListAsync();
        }

        public async Task<decimal> GetTotalPlatformRevenueAsync()
        {
            // Tính tổng tiền sàn thu được (AdminAmount) từ các đơn hàng thành công
            return await _context.Orders
                .Where(o => o.Status == OrderStatusEnum.Success)
                .SumAsync(o => o.AdminAmount);
        }
        public async Task<List<TeacherByRankDto>> GetTeachersByRankAsync(int rankEnum)
        {
            return await _context.Users
                .Where(u => u.Role.RoleName == "Teacher"
                       && (int)u.Rank == rankEnum
                       && !u.IsDeleted)
                .Select(u => new TeacherByRankDto
                {
                    UserId = u.Id,
                    FullName = u.FullName,
                    Email = u.Email,
                    AvatarUrl = u.AvatarUrl,
                    TotalRevenue = _context.Orders
                        .Where(o => o.teacherId == u.Id && o.Status == OrderStatusEnum.Success)
                        .Sum(o => o.Amount)
                })
                .ToListAsync();
        }

        public async Task<bool> UpdateRankAsync(int id, RankRequestDTO rankRequestDTO)
        {
            var existingRank = await _context.Ranks.FindAsync(id);
            if (existingRank == null)
            {
                return false;
            }
            existingRank.RequiredRevenue = rankRequestDTO.RequiredRevenue;
            existingRank.DefaultRate = rankRequestDTO.DefaultRate;
            var rowsAffected = await _context.SaveChangesAsync();
            return rowsAffected > 0;
        }
    }
}
