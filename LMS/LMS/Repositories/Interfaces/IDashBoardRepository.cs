using LMS.DTOs.Respone;

namespace LMS.Repositories.Interfaces
{
    public interface IDashBoardRepository
    {
        Task<AdminDashboardDto> GetDashboardDataAsync(DateTime fromDate, DateTime toDate);
    }
}
