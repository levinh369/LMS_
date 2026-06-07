using CloudinaryDotNet;
using LMS.Data;
using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Hub;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Linq.Expressions;

namespace LMS.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository userRepository;
        private readonly ICloudinaryService cloudinaryService;
        private readonly ApplicationDbContext _context;
        private readonly INotificationService notificationService;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IDashboardService _dashboardService;
        public UserService(IUserRepository userRepository, ICloudinaryService cloudinaryService, ApplicationDbContext applicationDbContext, INotificationService notificationService, IHubContext<NotificationHub> hubContext, IDashboardService dashboardService)
        {
            this.userRepository = userRepository;
            this.cloudinaryService = cloudinaryService;
            _context = applicationDbContext;
            this.notificationService = notificationService;
            _hubContext = hubContext;
            _dashboardService = dashboardService;
        }
        public async Task<MyProfileResponseDTO> GetFullProfileDataAsync(int userId)
        {
            return await userRepository.GetFullProfileDataAsync(userId);
        }

        public async Task<(List<UserResponseDTO> Data, int Total)> GetUserListAsync(int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive, int teacherId, int roleId, int courseId)
        {
            var (entities, total) = await userRepository.GetPagedAsync(page, pageSize, keySearch, fromDate, toDate, isActive, teacherId, roleId, courseId);

            var modelList = entities.Select(u => new UserResponseDTO
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                RoleId = u.RoleId,
                AvatarUrl = u.AvatarUrl,
                IsActive = u.IsActive,
                IsDeleted = u.IsDeleted,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt,
                RoleName = (RoleEnum)u.RoleId switch
                {
                    RoleEnum.Admin => "Quản trị viên",
                    RoleEnum.Student => "Học viên",
                    RoleEnum.Teacher => "Giảng viên",
                    _ => "N/A"
                },
                Courses = u.Enrollments != null ? u.Enrollments.Select(e => new UserCourseDTO
                {
                    CourseId = e.CourseId,
                    CourseName = e.Course.Title,
                    Progress = e.ProgressPercent
                }).ToList() : new List<UserCourseDTO>()
            }).ToList();

            return (modelList, total);
        }

        public async Task<UserSettingsResponseDTO> GetUserSettingsAsync(int userId)
        {
            return await userRepository.GetUserSettingsAsync(userId);
        }
        public async Task<UpdateProfileResponse> UpdateProfile(int userId, UpdateProfileRequestDTO request)
        {
            var user = await userRepository.GetByIdAsync(userId);
            if (user == null) throw new Exception("Không tìm thấy người dùng!");
            if (!string.IsNullOrEmpty(request.NewPassword))
            {
                // 1. Check xem có nhập mật khẩu hiện tại không
                if (string.IsNullOrEmpty(request.CurrentPassword))
                    throw new Exception("Bạn phải nhập mật khẩu hiện tại mới đổi được mật khẩu mới!");
                if (request.NewPassword != request.ConfirmPassword)
                    throw new Exception("Mật khẩu xác nhận không khớp!");
                if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                    throw new Exception("Mật khẩu hiện tại không chính xác!");

                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            }

            // Xử lý Avatar và FullName như cũ...
            if (request.AvatarFile != null)
            {
                user.AvatarUrl = await cloudinaryService.UploadImageAsync(request.AvatarFile);
            }
            user.FullName = request.FullName;

            await userRepository.UpdateAsync(user);
            return new UpdateProfileResponse { FullName = user.FullName, AvatarUrl = user.AvatarUrl };
        }
        public async Task DeleteAsync(int id)
        {
            var exist = await GetByIdOrThrowAsync(id);
            if (exist.IsDeleted)
            {
                throw new Exception("User đã bị xóa trước đó rồi");
            }
            await userRepository.DeleteAsync(exist);
        }
        public async Task UpdateAsync(int id, UserRequestDTO dto) 
        {
            var user = await GetByIdOrThrowAsync(id);

            if (user.IsDeleted)
            {
                throw new Exception("Tài khoản này đã bị xóa khỏi hệ thống, không thể cập nhật!");
            }
            user.FullName = dto.FullName;
            user.RoleId = dto.RoleId;
            user.IsActive = dto.IsActive;
            user.UpdatedAt = DateTime.UtcNow; 
            if (!string.IsNullOrEmpty(dto.AvatarUrl))
            {
                user.AvatarUrl = dto.AvatarUrl;
            }

            await userRepository.UpdateAsync(user);
        }
        public async Task<UserModel> GetByIdOrThrowAsync(int id)
        {
            var entity = await userRepository.GetByIdAsync(id);
            if (entity == null)
                throw new Exception("Danh mục khóa học không tồn tại");
            return entity;
        }

        public async Task<UserResponseDTO> GetByIdAsync(int id)
        {
            var entity = await GetByIdOrThrowAsync(id);
            var user = new UserResponseDTO
            {
                Id = entity.Id,
                FullName = entity.FullName,
                Email = entity.Email,
                RoleId = entity.RoleId,
                RoleName = entity.Role?.RoleName ?? (entity.RoleId == 1 ? "Admin" : (entity.RoleId == 3 ? "Giảng viên" : "Học viên")),

                AvatarUrl = entity.AvatarUrl ?? "/assets/img/default-avatar.png",
                CreatedAt = entity.CreatedAt, 
                IsActive = entity.IsActive,
            };
            return user;
        }

        public async Task<bool> ToggleStatusAsync(int id)
        {
            var user = await GetByIdOrThrowAsync(id);

            // Đảo ngược trạng thái hiện tại
            user.IsActive = !user.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            await userRepository.UpdateAsync(user);

            return user.IsActive; 
        }

        public async Task CreateAsync(UserRequestDTO dto)
        {
            var exist = await userRepository.GetByEmailAsync(dto.Email);
            if (exist != null)
            {
                throw new Exception("Email đã tồn tại trong hệ thống!");
            }
            var user = new UserModel
            {
                FullName = dto.FullName,
                Email = dto.Email,
                RoleId = dto.RoleId,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                AvatarUrl = dto.AvatarUrl ?? "/assets/img/default-avatar.png",

                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
            };
            await userRepository.AddAsync(user);
        }
        public async Task<UserModel> GetOrCreateExternalUserAsync(string email, string name, string avatar, string externalId, string provider)
        {
            var user = await userRepository.GetByExternalIdAsync(externalId, provider);

            if (user == null)
            {
                // 2. Nếu chưa, check xem Email đã tồn tại (có thể họ từng đăng ký bằng pass)
                user = await userRepository.GetByEmailAsync(email);

                if (user == null)
                {
                    string finalAvatarUrl = avatar; // Mặc định dùng link Google

                    if (!string.IsNullOrEmpty(avatar))
                    {
                        // Gọi hàm upload từ URL (Cloudinary hỗ trợ truyền thẳng URL ảnh vào)
                        // Vinh kiểm tra lại hàm Upload bên Service của bạn nhé
                        
                        var uploadResult = await cloudinaryService.UploadImageFromUrlAsync(avatar);
                        if (uploadResult != null)
                        {
                            finalAvatarUrl = uploadResult; // Thay bằng link Cloudinary "xịn"
                        }
                    }
                    // 3. Người mới hoàn toàn
                    user = new UserModel
                    {
                        Email = email,
                        FullName = name,
                        AvatarUrl = finalAvatarUrl,
                        Provider = provider, // Lưu "Google" hoặc "Facebook" tùy theo tham số truyền vào
                        ExternalId = externalId,
                        RoleId = 3,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        PasswordHash = ""
                    };
                    await userRepository.AddAsync(user);
                }
                else
                {
                    user.ExternalId = externalId;
                    user.Provider = provider;

                    // Nếu muốn cập nhật luôn ảnh cũ lên Cloudinary cho đồng bộ thì làm ở đây
                    if (!string.IsNullOrEmpty(avatar))
                    {
                        var uploadResult = await cloudinaryService.UploadImageFromUrlAsync(avatar);
                        user.AvatarUrl = uploadResult ?? avatar;
                    }

                    await userRepository.UpdateAsync(user);
                }
            }

            return user;
        }

        public async Task<List<OrderResponeDTO>> GetOrdersList(int userId)
        {
            return await userRepository.GetOrdersList(userId);
        }
        public async Task<(List<UserResponseDTO> Data, int Total)> GetDeletedUserListAsync(int page, int pageSize, string keySearch, int roleId, int currentUserId)
        {
            Expression<Func<UserModel, bool>> filter = x =>
            (string.IsNullOrEmpty(keySearch) || x.FullName.Contains(keySearch) || x.Email.Contains(keySearch))
            && (roleId == 0 || x.RoleId == roleId)
            && (currentUserId == 0 || x.Id == currentUserId);

            var (entities, total) = await userRepository.GetDeletedListAsync(
                 filter,
                 page,
                 pageSize,
                 x => x.Role
             );

            // 3. Map sang DTO
            var data = entities.Select(x => new UserResponseDTO
            {
                Id = x.Id,
                FullName = x.FullName,
                Email = x.Email,
                RoleId = x.RoleId,
                RoleName = x.Role?.RoleName,
                UpdatedAt = x.UpdatedAt,
                AvatarUrl = x.AvatarUrl,
            }).ToList();

            return (data, total);
        }

        public async Task HardDeleteAsync(int id)
        {
            var entity = await userRepository.GetByIdAsync(id);
            if (entity == null)
                throw new Exception("Người dùng không tồn tại");
            await userRepository.HardDeleteAsync(entity);
        }

        public async Task RestoreAsync(int id)
        {
            var entity = await userRepository.GetByIdAsync(id);
            if (entity == null)
                throw new Exception("Người dùng không tồn tại");
            await userRepository.RestoreAsync(entity);
        }
        public async Task<bool> RestoreBulkAsync(List<int> ids)
        {
            if (ids == null || !ids.Any()) return false;
            return await userRepository.UpdateDeleteStatusBulkAsync(ids, false);
        }

        public async Task<bool> SoftDeleteBulkAsync(List<int> ids)
        {
            if (ids == null || !ids.Any()) return false;
            return await userRepository.UpdateDeleteStatusBulkAsync(ids, true);
        }

        public async Task<bool> HardDeleteBulkAsync(List<int> ids)
        {
            if (ids == null || !ids.Any()) return false;
            return await userRepository.HardDeleteBulkAsync(ids);
        }
        public async Task<(bool IsSuccess, string Message)> CreateWithdrawalRequestAsync(int teacherId, WithdrawRequestDTO requestDto)
        {
            var teacher = await _context.Users.FindAsync(teacherId);
            if (teacher == null)
            {
                return (false, "Không tìm thấy thông tin tài khoản.");
            }

            if (teacher.WalletBalance < requestDto.Amount)
            {
                return (false, "Số dư trong ví không đủ để thực hiện giao dịch này.");
            }

            try
            {
                // 1. GIẢM TIỀN VÍ
                teacher.WalletBalance -= requestDto.Amount;

                // 2. Khởi tạo Record lịch sử
                var withdrawalRecord = new WithdrawalRequestModel
                {
                    UserId = teacherId,
                    Amount = requestDto.Amount,
                    BankName = requestDto.BankName,
                    AccountNumber = requestDto.AccountNumber,
                    AccountName = requestDto.AccountName.Trim().ToUpper(),
                    Status = WithdrawalStatusEnum.Pending
                };

                // 3. Đưa lệnh Thêm và Cập nhật vào Context
                _context.WithdrawalRequests.Add(withdrawalRecord);
                _context.Users.Update(teacher);

                await _context.SaveChangesAsync();

                // ==========================================
                // 4. GỬI THÔNG BÁO TỰ ĐỘNG CHO TẤT CẢ ADMIN
                // ==========================================
                string teacherMsg = $"Giảng viên <b>{teacher.FullName}</b> vừa đặt lệnh rút {requestDto.Amount:N0} VNĐ.";
                string url = "/withdraw/index.html";

                // Quét tìm RoleId của Admin
                var adminRoleId = await _context.Roles
                    .Where(r => r.RoleName == "Admin")
                    .Select(r => r.Id)
                    .FirstOrDefaultAsync();

                if (adminRoleId > 0)
                {
                    // Lấy ra toàn bộ danh sách User đang làm Admin
                    var adminIds = await _context.Users
                        .Where(u => u.RoleId == adminRoleId)
                        .Select(u => u.Id)
                        .ToListAsync();

                    // Rải thông báo cho từng Admin
                    foreach (var adminId in adminIds)
                    {
                        await notificationService.SendNotificationAsync(
                            adminId,
                            teacher.Id,
                            teacherMsg,
                            NotificationTypeEnum.WithdrawalRequest,
                            url,
                            null
                        );
                    }
                }

                // ==========================================
                // 5. BẮN TÍN HIỆU SIGNALR ĐỂ NHẢY SỐ (CHẤM ĐỎ)
                // ==========================================
                try
                {
                    var pendingCounts = await _dashboardService.GetPendingCountsAsync();
                    await _hubContext.Clients.Group("AdminGroup")
                        .SendAsync("ReceiveAdminNotificationCount", pendingCounts.WithdrawCount, pendingCounts.TeacherCount);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[SignalR Error] Lỗi khi bắn thông báo rút tiền: {ex.Message}");
                }

                return (true, "Tạo lệnh rút tiền thành công. Vui lòng chờ Admin phê duyệt!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Withdrawal Error]: {ex.Message}");
                return (false, "Lỗi hệ thống khi xử lý giao dịch. Vui lòng thử lại sau.");
            }
        }
    }
}
