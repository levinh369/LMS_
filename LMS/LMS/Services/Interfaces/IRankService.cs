using LMS.DTOs;
using LMS.DTOs.Request;

namespace LMS.Services.Interfaces
{
    public interface IRankService
    {
        Task<RankDashboardResponseDto> GetDashboardDataAsync();
        Task<List<TeacherByRankDto>> GetTeachersByRankAsync(int rankEnum);
        Task<bool> UpdateRankAsync(int id, RankRequestDTO rankRequestDTO);
    }
}
