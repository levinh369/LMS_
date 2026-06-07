using LMS.DTOs.Respone;

namespace LMS.Services.Interfaces
{
    public interface IDashboardService
    {
        Task<AdminDashboardDto> GetAdminDashboardData(DateTime fromDate, DateTime toDate);
        Task<TeacherDashboardResponseDTO> GetDashboardDataAsync(int teacherId, DateTime? startDate, DateTime? endDate);
        Task<List<object>> GetOnlineStudentsAsync(int teacherId, List<string> onlineUserIds, string? keySearch = null);
        Task<PendingCountsDto> GetPendingCountsAsync();
    }
}
