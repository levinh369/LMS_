using LMS.DTOs;
using LMS.DTOs.Request;

namespace LMS.Repositories.Interfaces
{
    public interface IRankRepository
    {
        Task<List<RankConfigItemDto>> GetRankConfigsWithTeacherCountAsync();
        Task<decimal> GetTotalPlatformRevenueAsync();
        Task<List<TeacherByRankDto>> GetTeachersByRankAsync(int rankEnum);
        Task<bool> UpdateRankAsync(int id, RankRequestDTO rankRequestDTO);
    }
}
