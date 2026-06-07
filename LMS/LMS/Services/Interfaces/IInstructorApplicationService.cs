using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Services.Interfaces
{
    public interface IInstructorApplicationService
    {
        Task<bool> ApplyInstructorAsync(int userId, string userName, ApplyInstructorRequestDTO dto);
        Task<IEnumerable<InstructorApplicationModel>> GetPendingApplicationsAsync();
        Task<bool> ApproveApplicationAsync(int applicationId);
        Task<bool> RejectApplicationAsync(int applicationId, string rejectReason);
        Task<(List<InstructorApplicationResponseDTO> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch, string status, string sort);
        Task<InstructorApplicationResponseDTO> DetailApplicationAsync(int applicationId);
        Task<InstructorApplicationModel> GetByIdOrThrowAsync(int id);
        Task DeleteAsync(int id);
    }
}
