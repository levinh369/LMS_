using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;

namespace LMS.Services
{
    public class EnrollService : IEnrollmentService
    {
        private IEnrollRepository enrollRepository;
        public EnrollService(IEnrollRepository enrollRepository)
        {
            this.enrollRepository = enrollRepository;
          
        }
        public async Task<EnrollResponseDTO> AddEnrollAsync(int userId, EnrollRequestDTO dto)
        {
            // 1. Kiểm tra xem học viên đã đăng ký chưa
            var exist = await enrollRepository.IsEnrolledAsync(userId, dto.CourseId);
            if (exist)
            {
                // Thay vì throw Exception chung chung, bác nên dùng Custom Exception hoặc trả về Result Pattern
                throw new Exception("Khóa học đã được đăng ký rồi!");
            }

            // 2. Khởi tạo Model (Bổ sung các trường bác đã định nghĩa trong DB)
            var enroll = new EnrollmentModel
            {
                UserId = userId,
                CourseId = dto.CourseId,
                CreatedAt = DateTime.UtcNow.AddHours(7),
                UpdatedAt = DateTime.UtcNow.AddHours(7), // Khởi tạo UpdatedAt luôn
                IsActive = true,          // Mặc định là kích hoạt ngay
                IsDeleted = false         // Chưa xóa
            };

            // 3. Lưu vào database thông qua Repository
            await enrollRepository.AddAsync(enroll);

            // 4. Trả về DTO để Frontend có dữ liệu mà "vèo" vào trang học
            return new EnrollResponseDTO
            {
                CourseId = enroll.CourseId,
                EnrolledAt = enroll.CreatedAt,
                IsSuccess = true,
                Message = "Ghi danh thành công! Chào mừng bác vào lớp."
            };
        }

        public Task<IEnumerable<EnrollResponseDTO>> GetMyEnrollmentsAsync(int userId)
        {
            throw new NotImplementedException();
        }

        public Task<int> GetStudentCountAsync(int courseId)
        {
            throw new NotImplementedException();
        }

        public async Task<bool> IsEnrolledAsync(int userId, int courseId)
        {
            return await enrollRepository.IsEnrolledAsync(userId, courseId);
        }

        public Task<bool> UnenrollAsync(int userId, int courseId)
        {
            throw new NotImplementedException();
        }
    }
}
