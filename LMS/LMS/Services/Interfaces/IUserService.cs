using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Services.Interfaces
{
    public interface IUserService
    {
        Task<MyProfileResponseDTO> GetFullProfileDataAsync(int userId);
        Task<UserSettingsResponseDTO> GetUserSettingsAsync(int userId);
        Task<UpdateProfileResponse?> UpdateProfile(int userId, UpdateProfileRequestDTO request);
        Task<UserResponseDTO> GetByIdAsync(int id);
        Task UpdateAsync(int id, UserRequestDTO dto);
        Task<UserModel> GetByIdOrThrowAsync(int id);
        Task DeleteAsync(int id);
        Task<(List<UserResponseDTO> Data, int Total)> GetUserListAsync(
       int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive);
        Task<bool> ToggleStatusAsync(int id);
        Task CreateAsync(UserRequestDTO dto);
        Task<UserModel> GetOrCreateExternalUserAsync(string email, string name, string avatar, string externalId, string provider);
        Task<List<OrderResponeDTO>> GetOrdersList(int userId);
    }
}
