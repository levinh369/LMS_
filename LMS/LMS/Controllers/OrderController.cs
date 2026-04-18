using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
            private readonly IOrderService _orderService;

            public OrderController(IOrderService orderService)
            {
                _orderService = orderService;
            }
            [HttpGet("list-data")]
            public async Task<IActionResult> ListData(
            int page = 1,
            int pageSize = 10,
            string keySearch = "",
            DateTime? fromDate = null,
            DateTime? toDate = null,
            int status = -1)
            {
                var (data, total) = await _orderService.GetOrderListAsync(
                    page, pageSize, keySearch, fromDate, toDate, status);
                return Ok(new
                {
                    success = true,
                    total = total,
                    data = data
                });
            }
            // 1. Lấy toàn bộ danh sách đơn hàng cho bảng Admin
            [HttpGet]
            public async Task<IActionResult> GetAllOrders()
            {
                var orders = await _orderService.GetAllOrdersForAdminAsync();
                return Ok(orders);
            }

            // 2. Lấy chi tiết một đơn hàng để hiện Modal
            [HttpGet("{id}")]
            public async Task<IActionResult> GetOrderDetail(int id)
            {
                var order = await _orderService.GetOrderDetailForAdminAsync(id);
                if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng này bác ơi!" });

                return Ok(order);
            }

            // 3. Admin xác nhận thanh toán thủ công (Duyệt tay)
            [HttpPost("{id}/confirm")]
            public async Task<IActionResult> ConfirmPayment(int id)
            {
                var result = await _orderService.ConfirmManualPaymentAsync(id);
                if (!result) return BadRequest(new { message = "Duyệt đơn thất bại. Có thể đơn đã được thanh toán hoặc không tồn tại." });

                return Ok(new { message = "Đã duyệt đơn và kích hoạt khóa học thành công!" });
            }

        // 4. Cập nhật trạng thái (Hủy đơn, Đánh dấu lỗi...)
            [HttpPut("{id}/status")]
            public async Task<IActionResult> UpdateStatus(int id, [FromBody] int status) // Đổi sang int
            {
                // Truyền trực tiếp con số này vào Service
                var result = await _orderService.UpdateOrderStatusAsync(id, status);

                if (!result) return BadRequest(new { message = "Cập nhật trạng thái thất bại." });
                return Ok(new { message = "Cập nhật trạng thái đơn hàng thành công!" });
            }

        // 5. API lấy doanh thu tháng để hiện lên Header Admin
        [HttpGet("revenue/monthly")]
            public async Task<IActionResult> GetMonthlyRevenue()
            {
                var revenue = await _orderService.GetMonthlyRevenueAsync();
                return Ok(new { revenue });
            }
        }
    }

