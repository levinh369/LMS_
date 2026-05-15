using LMS.DTOs.Request;
using LMS.DTOs.Respone;

namespace LMS.Services.Interfaces
{
    public interface IEnrollmentService
    {
        // Đăng ký khóa học mới
        Task<EnrollResponseDTO> AddEnrollAsync(int userId, EnrollRequestDTO dto);

        // Kiểm tra xem User đã đăng ký khóa học này chưa (Để hiện nút "Vào học" hay "Đăng ký")
        Task<bool> IsEnrolledAsync(int userId, int courseId);
        Task<IEnumerable<EnrollResponseDTO>> GetMyEnrollmentsAsync(int userId);
        Task<int> GetStudentCountAsync(int courseId);
        Task<bool> UnenrollStudentAsync(int studentId, int courseId, int teacherId);
    }
}
