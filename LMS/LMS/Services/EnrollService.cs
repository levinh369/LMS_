using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;

namespace LMS.Services
{
    public class EnrollService : IEnrollmentService
    {
        private IEnrollRepository enrollRepository;
        private INotificationRepository notificationRepository;
        private readonly INotificationService notificationService;
        public EnrollService(IEnrollRepository enrollRepository, INotificationRepository notificationRepository, INotificationService notificationService)
        {
            this.enrollRepository = enrollRepository;
            this.notificationRepository = notificationRepository;
            this.notificationService = notificationService;
        }
        public async Task<EnrollResponseDTO> AddEnrollAsync(int userId, EnrollRequestDTO dto)
        {
            // 1. Kiểm tra xem học viên đã đăng ký chưa
            var exist = await enrollRepository.IsEnrolledAsync(userId, dto.CourseId);
            if (exist)
            {
                throw new Exception("Khóa học đã được đăng ký rồi!");
            }

            // 2. Khởi tạo và lưu Enrollment trước
            var enroll = new EnrollmentModel
            {
                UserId = userId,
                CourseId = dto.CourseId,
                CreatedAt = DateTime.UtcNow.AddHours(7),
                UpdatedAt = DateTime.UtcNow.AddHours(7),
                IsActive = true,
                IsDeleted = false
            };
            await enrollRepository.AddAsync(enroll);
            string message = $"Học viên <b>{dto.StudentName}</b> vừa tham gia khóa học của bạn.";
            string url = $"/instructor/courses/{dto.CourseId}/students";

            await notificationService.SendNotificationAsync(
                dto.TeacherId,                // Người nhận (Giảng viên)
                userId,                       // Người gửi (Học viên)
                message,
                NotificationTypeEnum.NewEnrollment,
                url,
                null                          // Không có reaction
            );

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
