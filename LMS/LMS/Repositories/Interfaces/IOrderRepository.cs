using LMS.Models;

namespace LMS.Repositories.Interfaces
{
    public interface IOrderRepository : IRepository<OrderModel>
    {
        Task<IEnumerable<OrderModel>> GetAllOrdersWithDetailsAsync();

        // Hàm lấy chi tiết 1 đơn hàng cụ thể
        Task<OrderModel?> GetOrderDetailsByIdAsync(int orderId);
        Task<(List<OrderModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch,
           DateTime? fromDate, DateTime? toDate, int status, int teacherId);
        Task<List<OrderModel>> GetAllOrdersForExportAsync(string keySearch, DateTime? fromDate, DateTime? toDate, int status, int filterTeacherId);
    }
}
