using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Services.Interfaces
{
    public interface IOrderService
    {
        Task<IEnumerable<OrderResponeDTO>> GetAllOrdersForAdminAsync();
        Task<(List<OrderResponeDTO> Data, int Total)> GetOrderListAsync(
        int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int status);

        // Lấy chi tiết 1 đơn hàng để hiện Modal
        Task<OrderAdminDetailDTO> GetOrderDetailForAdminAsync(int orderId);

        // Cập nhật trạng thái đơn hàng (Duyệt đơn, Hủy đơn)
        Task<bool> UpdateOrderStatusAsync(int orderId, int newStatus);

        // Xác nhận thanh toán thủ công (Dành cho Admin khi nhận tiền mặt)
        Task<bool> ConfirmManualPaymentAsync(int orderId);

        // Thống kê doanh thu tháng hiện tại cho Header Admin
        Task<decimal> GetMonthlyRevenueAsync();
        Task<bool> CancelOrderAsync(int orderId);
    }
}
