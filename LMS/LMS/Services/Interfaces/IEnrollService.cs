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

        // Lấy danh sách các khóa học mà User hiện tại đã đăng ký (Trang "Khóa học của tôi")
        Task<IEnumerable<EnrollResponseDTO>> GetMyEnrollmentsAsync(int userId);

        // Hủy ghi danh (Nếu cần tính năng hoàn tiền hoặc Admin xóa học viên)
        Task<bool> UnenrollAsync(int userId, int courseId);

        // Thống kê số lượng học viên của một khóa học (Dành cho Admin/Giảng viên)
        Task<int> GetStudentCountAsync(int courseId);
    }
}
