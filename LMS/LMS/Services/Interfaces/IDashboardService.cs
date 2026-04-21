using LMS.DTOs.Respone;

namespace LMS.Services.Interfaces
{
    public interface IDashboardService
    {
        Task<AdminDashboardDto> GetAdminDashboardData(DateTime fromDate, DateTime toDate);
    }
}
