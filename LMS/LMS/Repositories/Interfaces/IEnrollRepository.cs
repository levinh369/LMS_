using LMS.Models;
using Microsoft.EntityFrameworkCore.Storage;

namespace LMS.Repositories.Interfaces
{
    public interface IEnrollRepository : IRepository<EnrollmentModel>
    {
        Task<bool> IsEnrolledAsync(int userId, int courseId);
       Task<List<EnrollmentModel>> GetUserEnrollmentsAsync(int userId);
       Task<bool> UnenrollStudentAsync(int studentId, int courseId, int teacherId);
        Task<List<object>> FilterMyStudentsAsync(int teacherId, List<string> onlineUserIds);


        }
}
