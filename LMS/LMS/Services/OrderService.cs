using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Services
{
    public class OrderService : IOrderService
    {
        private readonly IOrderRepository _orderRepository;
        private readonly IEnrollmentService enrollmentService;

        public OrderService(IOrderRepository orderRepository, IEnrollmentService enrollmentService)
        {
            _orderRepository = orderRepository;
            this.enrollmentService = enrollmentService;
        }

        // 1. Lấy danh sách cho Admin (Map từ Model sang DTO)
        public async Task<IEnumerable<OrderResponeDTO>> GetAllOrdersForAdminAsync()
        {
            var orders = await _orderRepository.GetAllOrdersWithDetailsAsync();

            return orders.Select(o => new OrderResponeDTO
            {
                OrderId = o.Id,
                OrderCode = $"ORD-{o.Id}",
                CustomerName = o.User?.FullName ?? "N/A",
                CustomerEmail = o.User?.Email ?? "N/A",
                CourseTitle = o.Course?.Title ?? "N/A",
                TotalAmount = o.Amount,
                Status = o.Status.ToString(),
                CreatedAt = o.CreatedAt
            });
        }

        // 2. Lấy chi tiết đơn hàng cho Modal
        public async Task<OrderAdminDetailDTO> GetOrderDetailForAdminAsync(int orderId)
        {
            var o = await _orderRepository.GetOrderDetailsByIdAsync(orderId);
            if (o == null) return null;

            return new OrderAdminDetailDTO
            {
                OrderId = o.Id,
                OrderCode = $"ORD-{o.Id}",
                CustomerName = o.User?.FullName ?? "N/A",
                CustomerEmail = o.User?.Email ?? "N/A",
                CourseTitle = o.Course?.Title ?? "N/A",
                TotalAmount = o.Amount,
                Status = o.Status.ToString(),
                CreatedAt = o.CreatedAt,
                OrderDescription = o.OrderDescription,
                TransactionId = o.VnpayTranNo ?? "N/A",
                
                // Thêm các trường khác bác muốn hiện trên Modal
            };
        }

        // 3. Cập nhật trạng thái đơn hàng (Duyệt, Hủy...)
        public async Task<bool> UpdateOrderStatusAsync(int orderId, int newStatus) // Nhận int
        {
            var order = await _orderRepository.GetOrderDetailsByIdAsync(orderId);
            if (order == null) return false;

            // Ép kiểu trực tiếp từ int sang Enum
            var status = (OrderStatusEnum)newStatus;

            // Kiểm tra xem con số gửi lên có nằm trong định nghĩa Enum không (Tránh gửi số linh tinh)
            if (!Enum.IsDefined(typeof(OrderStatusEnum), status)) return false;

            // 1. Chặn trường hợp: Đã Success (1) rồi thì không cho đổi ngược lại
            if (order.Status == OrderStatusEnum.Success && status != OrderStatusEnum.Success)
            {
                return false;
            }

            // 2. Cập nhật trạng thái
            order.Status = status;
            await _orderRepository.UpdateAsync(order);

            // 3. Nếu chuyển sang Success (1) -> Cấp quyền học
            if (status == OrderStatusEnum.Success)
            {
                var enrollDto = new EnrollRequestDTO { CourseId = order.CourseId };
                await enrollmentService.AddEnrollAsync(order.UserId, enrollDto);
            }

            return true;
        }

        // 4. Xác nhận thanh toán thủ công (Admin nhấn nút Duyệt)
        public async Task<bool> ConfirmManualPaymentAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order == null || order.Status != OrderStatusEnum.Pending) return false;

            order.Status = OrderStatusEnum.Success;
            // Ở đây bác có thể gọi thêm EnrollmentService để cấp quyền vào học luôn cho User

            await _orderRepository.UpdateAsync(order);
            return true;
        }

        // 5. Tính doanh thu tháng hiện tại
        public async Task<decimal> GetMonthlyRevenueAsync()
        {
            var orders = await _orderRepository.GetAllOrdersWithDetailsAsync();
            var currentMonth = DateTime.Now.Month;
            var currentYear = DateTime.Now.Year;

            return orders
                .Where(o => o.Status == OrderStatusEnum.Success
                         && o.CreatedAt.Month == currentMonth
                         && o.CreatedAt.Year == currentYear)
                .Sum(o => o.Amount);
        }

        public async Task<(List<OrderResponeDTO> Data, int Total)> GetOrderListAsync(
         int page,
         int pageSize,
         string keySearch,
         DateTime? fromDate,
         DateTime? toDate,
         int status)
        {
            // 1. Gọi Repository để lấy dữ liệu thực thể (Entities) và tổng số bản ghi
            var (entities, total) = await _orderRepository.GetPagedAsync(page, pageSize, keySearch, fromDate, toDate, status);

            // 2. Map từ List<OrderModel> sang List<OrderResponeDTO>
            var dtoList = entities.Select(o => new OrderResponeDTO
            {
                OrderId = o.Id,
                OrderCode = $"ORD-{o.Id}",
                CustomerName = o.User?.FullName ?? "N/A", // Đã có Include từ Repo nên không lo null
                CustomerEmail = o.User?.Email ?? "N/A",
                CourseTitle = o.Course?.Title ?? "N/A",
                TotalAmount = o.Amount,
                Status = o.Status.ToString(), // Chuyển Enum sang chuỗi (Success, Pending...)
                CreatedAt = o.CreatedAt,
                AvatarUrl = o.User.AvatarUrl
            }).ToList();

            return (dtoList, total);
        }
        public async Task<bool> CancelOrderAsync(int orderId)
        {
            var order = await _orderRepository.GetByIdAsync(orderId);

            if (order == null || order.Status == OrderStatusEnum.Success)
                return false;

            order.Status = OrderStatusEnum.Cancelled;
            await _orderRepository.UpdateAsync(order);

            return true;
        }
    }
}