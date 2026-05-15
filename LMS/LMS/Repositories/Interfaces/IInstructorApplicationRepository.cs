using LMS.Models;

namespace LMS.Repositories.Interfaces
{
    public interface IInstructorApplicationRepository : IRepository<InstructorApplicationModel>
    {
        Task<bool> HasPendingApplicationAsync(int userId);

        // 2. Lấy danh sách các đơn đang chờ duyệt (Dành cho màn hình Admin)
        Task<IEnumerable<InstructorApplicationModel>> GetPendingApplicationsAsync();

        // 3. Xem chi tiết 1 đơn, kèm theo thông tin của User (Tên, Email)
        Task<InstructorApplicationModel> GetApplicationWithUserAsync(int applicationId);

        // 4. Logic duyệt đơn: Cập nhật status đơn + Đổi Role của User thành Giảng viên
        Task<bool> ApproveApplicationAsync(int applicationId, int instructorRoleId);

        // 5. Logic từ chối đơn: Cập nhật status + Ghi lại lý do từ chối
        Task<bool> RejectApplicationAsync(int applicationId, string rejectReason);
        Task<(List<InstructorApplicationModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch,
          string isAcitve, string sort);
        Task<InstructorApplicationModel> GetApplicationWithUserByIdAsync(int id);
    }
}
