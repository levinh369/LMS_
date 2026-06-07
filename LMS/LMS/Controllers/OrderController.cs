using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Controllers
{
   
    [Authorize(Roles = "Admin, Teacher")]
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
            int status = -1, int teacherId = 0)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int currentUserId = int.TryParse(userIdClaim, out var id) ? id : 0;
            var currentUserRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";

            int filterTeacherId;
            if (currentUserRole == "Admin")
            {
                filterTeacherId = teacherId;
            }
            else
            {
                filterTeacherId = currentUserId;
            }

            var (data, total) = await _orderService.GetOrderListAsync(
                    page, pageSize, keySearch, fromDate, toDate, status, filterTeacherId);
            return Ok(new
            {
                success = true,
                total = total,
                data = data
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAllOrders()
        {
            var orders = await _orderService.GetAllOrdersForAdminAsync();
            return Ok(orders);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderDetail(int id)
        {
            var order = await _orderService.GetOrderDetailForAdminAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng này bác ơi!" });

            return Ok(order);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("{id}/confirm")]
        public async Task<IActionResult> ConfirmPayment(int id)
        {
            var result = await _orderService.ConfirmManualPaymentAsync(id);
            if (!result) return BadRequest(new { message = "Duyệt đơn thất bại. Có thể đơn đã được thanh toán hoặc không tồn tại." });

            return Ok(new { message = "Đã duyệt đơn và kích hoạt khóa học thành công!" });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] int status)
        {
            var result = await _orderService.UpdateOrderStatusAsync(id, status);

            if (!result) return BadRequest(new { message = "Cập nhật trạng thái thất bại." });
            return Ok(new { message = "Cập nhật trạng thái đơn hàng thành công!" });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("revenue/monthly")]
        public async Task<IActionResult> GetMonthlyRevenue()
        {
            var revenue = await _orderService.GetMonthlyRevenueAsync();
            return Ok(new { revenue });
        }
        [HttpGet("export-excel")]
        public async Task<IActionResult> ExportExcel(
    string keySearch = "",
    DateTime? fromDate = null,
    DateTime? toDate = null,
    int status = -1, int teacherId = 0)
        {
            try
            {
                // 1. Phân quyền mềm y hệt hàm list-data của bác
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                int currentUserId = int.TryParse(userIdClaim, out var id) ? id : 0;
                var currentUserRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";

                int filterTeacherId = currentUserRole == "Admin" ? teacherId : currentUserId;

                // 2. Gọi sang Service để xử lý xuất dữ liệu ra mảng byte
                var fileBytes = await _orderService.ExportOrdersToExcelAsync(
                    keySearch, fromDate, toDate, status, filterTeacherId);

                string fileName = $"Danh_Sach_Don_Hang_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";

                // 3. Trả về file dưới dạng Stream cho Browser tự tải xuống
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = "Lỗi xuất file: " + ex.Message });
            }
        }
    }
}