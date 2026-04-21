using LMS.DTOs.Respone;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;

namespace LMS.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly IDashBoardRepository _repo;
        public DashboardService(IDashBoardRepository repo) { _repo = repo; }

        public async Task<AdminDashboardDto> GetAdminDashboardData(DateTime fromDate, DateTime toDate)
        {
            if (fromDate > toDate) (fromDate, toDate) = (toDate, fromDate);
            return await _repo.GetDashboardDataAsync(fromDate, toDate);
        }
    }
}
