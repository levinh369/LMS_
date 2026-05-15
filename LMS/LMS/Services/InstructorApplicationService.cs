using CloudinaryDotNet;
using LMS.Data;
using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Services
{
    public class InstructorApplicationService : IInstructorApplicationService
    {
        private readonly IInstructorApplicationRepository _applicationRepo;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly INotificationService notificationService;
        public InstructorApplicationService(
            IInstructorApplicationRepository applicationRepo,
            ICloudinaryService cloudinaryService,
            ApplicationDbContext context,
            IEmailService emailService,
            INotificationService notificationService)
        {
            _applicationRepo = applicationRepo;
            _cloudinaryService = cloudinaryService;
            _context = context;
            _emailService = emailService;
            this.notificationService = notificationService;
        }

        public async Task<bool> ApplyInstructorAsync(int userId, string userName, ApplyInstructorRequestDTO dto)
        {
            // 1. Kiểm tra đơn trùng
            var isPending = await _applicationRepo.HasPendingApplicationAsync(userId);
            if (isPending)
            {
                throw new Exception("Bạn đã có một đơn đăng ký đang chờ duyệt.");
            }

            // 2. Upload CV
            var cvUrl = await _cloudinaryService.UploadDocumentAsync(dto.CvFile);
            if (string.IsNullOrEmpty(cvUrl))
            {
                throw new Exception("Quá trình tải lên file CV thất bại.");
            }

            // 3. Khởi tạo Model
            var application = new InstructorApplicationModel
            {
                UserId = userId,
                Bio = dto.Bio,
                Experience = dto.Experience,
                CvUrl = cvUrl,
                Status = ApplicationStatusEnum.Pending
            };
            await _applicationRepo.AddAsync(application);
            string adminMsg = $"<b>{userName}</b> vừa gửi yêu cầu đăng ký trở thành giảng viên.";
            string url = $"/admin/applications/{application.Id}";

            // BƯỚC QUAN TRỌNG: Lấy danh sách ID của các Admin
            // (Nếu bạn đã làm Enum RoleTypeEnum.Admin = 1 thì thay thẳng vào đây cho xịn)
            var adminRoleId = await _context.Roles
                .Where(r => r.RoleName == "Admin")
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (adminRoleId > 0)
            {
                // Lấy ra tất cả User đang có Role là Admin
                var adminIds = await _context.Users
                    .Where(u => u.RoleId == adminRoleId)
                    .Select(u => u.Id)
                    .ToListAsync();

                // Lặp qua từng Admin và gửi thông báo cho họ
                foreach (var adminId in adminIds)
                {
                    await notificationService.SendNotificationAsync(
                        adminId,                     // Người nhận: Lần lượt từng Admin
                        userId,                      // Người gửi: User đang nộp đơn
                        adminMsg,
                        NotificationTypeEnum.InstructorApplicationPending,
                        url,
                        null
                    );
                }
            }

            return true;
        }

        public async Task<IEnumerable<InstructorApplicationModel>> GetPendingApplicationsAsync()
        {
            return await _applicationRepo.GetPendingApplicationsAsync();
        }

        public async Task<bool> ApproveApplicationAsync(int applicationId)
        {
            var instructorRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Teacher");
            if (instructorRole == null)
            {
                throw new Exception("Lỗi hệ thống: Không tìm thấy quyền Giảng viên (Role).");
            }

            var isSuccess = await _applicationRepo.ApproveApplicationAsync(applicationId, instructorRole.Id);
            if (isSuccess)
            {
                // Lấy thông tin user để lấy Email
                var application = await _applicationRepo.GetApplicationWithUserAsync(applicationId);

                // Gửi email chúc mừng
                string subject = "Chúc mừng! Đơn đăng ký giảng viên đã được duyệt";
                string body = $@"
                <h3>Chào {application.User.FullName},</h3>
                <p>Hồ sơ đăng ký giảng viên của bạn trên hệ thống LMS đã được phê duyệt.</p>
                <p>Ngay bây giờ, bạn có thể đăng nhập lại vào hệ thống để truy cập Bảng điều khiển giảng viên và bắt đầu tạo khóa học đầu tiên của mình!</p>
                <br/>
                <p>Trân trọng,</p>
                <p>Ban Quản Trị LMS</p>";

                await _emailService.SendEmailAsync(application.User.Email, subject, body);

            }
            return isSuccess;
        }

        public async Task<bool> RejectApplicationAsync(int applicationId, string rejectReason)
        {
            var isSuccess = await _applicationRepo.RejectApplicationAsync(applicationId, rejectReason);
            if (isSuccess)
            {
                var application = await _applicationRepo.GetApplicationWithUserAsync(applicationId);

                // Gửi email báo lỗi và kèm theo lý do (rejectReason)
                string subject = "Thông báo về đơn đăng ký giảng viên";
                string body = $@"
                    <h3>Chào {application.User.FullName},</h3>
                    <p>Cảm ơn bạn đã quan tâm và nộp hồ sơ giảng viên trên hệ thống LMS.</p>
                    <p>Rất tiếc, hồ sơ của bạn hiện tại chưa được phê duyệt với lý do sau:</p>
                    <p><strong>{rejectReason}</strong></p>
                    <p>Bạn có thể cập nhật lại thông tin và nộp lại đơn trong tương lai.</p>
                    <br/>
                    <p>Trân trọng,</p>";

                await _emailService.SendEmailAsync(application.User.Email, subject, body);
            }

            return isSuccess;
        }

        public async Task<(List<InstructorApplicationResponseDTO> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch, string status, string sort)
        {
            var (entities, total) = await _applicationRepo.GetPagedAsync(page, pageSize, keySearch, status, sort);
            var modelList = entities.Select(x => new InstructorApplicationResponseDTO
            {
                Id = x.Id,
                FullName = x.User.FullName,
                Email = x.User.Email,
                Bio = x.Bio,
                Experience = x.Experience,
                CvUrl = x.CvUrl,
                Status = x.Status.ToString(),
                AppliedAt = x.CreatedAt

            }).ToList();
            return (modelList, total);
        }
        public async Task<InstructorApplicationModel> GetByIdOrThrowAsync(int id)
        {
            var entity = await _applicationRepo.GetApplicationWithUserAsync(id);
            if (entity == null)
                throw new Exception("Đơn ứng tuyển không tồn tại");
            return entity;
        }

        public async Task<InstructorApplicationResponseDTO> DetailApplicationAsync(int applicationId)
        {
            var x = await GetByIdOrThrowAsync(applicationId);

            var course = new InstructorApplicationResponseDTO
            {
                Id = x.Id,
                FullName = x.User.FullName,
                Email = x.User.Email,
                Bio = x.Bio,
                Experience = x.Experience,
                CvUrl = x.CvUrl,
                Status = x.Status.ToString(),
                AppliedAt = x.CreatedAt
            };
            return course;
        }
    }
}
