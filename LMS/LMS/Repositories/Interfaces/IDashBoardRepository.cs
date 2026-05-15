using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Repositories.Interfaces
{
    public interface IDashBoardRepository
    {
        Task<AdminDashboardDto> GetDashboardDataAsync(DateTime fromDate, DateTime toDate);
        IQueryable<EnrollmentModel> GetEnrollmentsQuery();

        IQueryable<EnrollmentModel> GetEnrollmentsQueryByDate(DateTime startDate, DateTime endDate);
        IQueryable<EnrollmentModel> FilterMyStudentsQuery(int teacherId, List<string> onlineUserIds, string? keySearch = null);
    }
}
