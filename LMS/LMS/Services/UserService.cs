using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace LMS.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository userRepository;
        private readonly ICloudinaryService cloudinaryService;
        public UserService(IUserRepository userRepository, ICloudinaryService cloudinaryService)
        {
            this.userRepository = userRepository;
            this.cloudinaryService = cloudinaryService;
        }
        public async Task<MyProfileResponseDTO> GetFullProfileDataAsync(int userId)
        {
            return await userRepository.GetFullProfileDataAsync(userId);
        }

        public async Task<(List<UserResponseDTO> Data, int Total)> GetUserListAsync(int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive)
        {
            var (entities, total) = await userRepository.GetPagedAsync(page, pageSize, keySearch, fromDate, toDate, isActive);

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
                }
            }).ToList();

            return (modelList, total);
        }

        public async Task<UserSettingsResponseDTO> GetUserSettingsAsync(int userId)
        {
            return await userRepository.GetUserSettingsAsync(userId);
        }

       

        public async Task<UpdateProfileResponse?> UpdateProfile(int userId, UpdateProfileRequestDTO request)
        {
            var user = await userRepository.GetByIdAsync(userId);
            if (user == null) return null;

            if (!string.IsNullOrEmpty(request.NewPassword))
            {
                if (!string.IsNullOrEmpty(user.PasswordHash))
                {
                    if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                        return null;
                }
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            }
            if (request.AvatarFile != null)
            {
                var avatarUrl = await cloudinaryService.UploadImageAsync(request.AvatarFile);
                user.AvatarUrl = avatarUrl;
            }

            // 3. Cập nhật thông tin khác
            user.FullName = request.FullName;
            await userRepository.UpdateAsync(user);
            return new UpdateProfileResponse
            {
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl
            };
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
    }
}
