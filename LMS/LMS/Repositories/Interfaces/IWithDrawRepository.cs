using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Repositories.Interfaces
{
    public interface IWithDrawRepository
    {
        Task<WithdrawalRequestModel> GetByIdAsync(int id);

        // 2. Thêm mới lệnh rút tiền (Giảng viên dùng)
        Task AddAsync(WithdrawalRequestModel request);

        // 3. Cập nhật đơn (Admin dùng khi Duyệt/Từ chối)
        Task UpdateAsync(WithdrawalRequestModel request);

        // 4. Lấy danh sách có Lọc & Phân trang cho màn hình Admin
        Task<(List<WithdrawalRequestModel> Data, int Total)> GetListForAdminAsync(
            string keyword,
            int status,
            DateTime? fromDate,
            DateTime? toDate,
            int pageIndex,
            int pageSize);

        // 5. Lấy lịch sử rút tiền của riêng 1 Giảng viên (Giảng viên tự xem)
        Task<(List<WithdrawalRequestModel> Data, int TotalCount)> GetHistoryByTeacherIdAsync(
            int teacherId,
            int pageIndex,
            int pageSize);

        // 6. Lưu thay đổi xuống Database
        Task SaveChangesAsync();
   
    }
}
