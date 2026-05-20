using LMS.DTOs.Request;
using LMS.DTOs.Respone;

namespace LMS.Services.Interfaces
{
    public interface IWithdrawalService
    {
        Task<(bool IsSuccess, string Message)> CreateWithdrawalRequestAsync(int teacherId, WithdrawRequestDTO requestDto);

        // 2. Dành cho Giảng viên: Xem lịch sử của mình
        Task<(List<WithdrawalResponseDTO> Data, int Total)> GetTeacherHistoryAsync(int teacherId, int pageIndex, int pageSize);

        // 3. Dành cho Admin: Lấy danh sách tổng
        Task<(List<WithdrawalResponseDTO> Data, int Total)> GetAdminWithdrawalsAsync(string keyword, int status, DateTime? fromDate, DateTime? toDate, int pageIndex, int pageSize);

        // 4. Dành cho Admin: Xử lý duyệt / từ chối
        Task<(bool IsSuccess, string Message)> ProcessWithdrawalAsync(int adminId, ProcessWithdrawalDTO dto);
        Task<TeacherWalletStatsDTO> GetTeacherWalletStatsAsync(int teacherId);
        Task<(List<WithdrawalHistoryDTO> Data, int Total)> GetTeacherHistoryAsync(int teacherId, int pageIndex, int pageSize, int status = -1);
    }
}
