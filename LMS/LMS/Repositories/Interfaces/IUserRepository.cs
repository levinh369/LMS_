using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Repositories.Interfaces
{
    public interface IUserRepository : IRepository<UserModel>
    {
        Task<UserModel?> GetByEmailAsync(string email);
        Task<bool> ExistsByEmailAsync(string email);
        Task<MyProfileResponseDTO> GetFullProfileDataAsync(int userId);
        Task<UserSettingsResponseDTO> GetUserSettingsAsync(int userId);
        Task<(List<UserModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch,
            DateTime? fromDate, DateTime? toDate, int isAcitve);
        Task<UserModel?> GetByExternalIdAsync(string externalId, string provider);
        Task<List<OrderResponeDTO>> GetOrdersList(int userId);
    }
}
