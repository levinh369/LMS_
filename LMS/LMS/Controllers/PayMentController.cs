using LMS.Configs;
using LMS.Data;
using LMS.DTOs; // Thay bằng namespace DTO của bác
using LMS.DTOs.Request;
using LMS.Enums;
using LMS.Models;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
[Route("api/[controller]")]
[ApiController]
public class PaymentController : ControllerBase
{
    private readonly ApplicationDbContext _context; // Thay bằng DbContext của bác
    private readonly IEnrollmentService _enrollmentService;
    private readonly IConfiguration _configuration;

    public PaymentController(ApplicationDbContext context, IEnrollmentService enrollmentService, IConfiguration configuration)
    {
        _context = context;
        _enrollmentService = enrollmentService;
        _configuration = configuration;
    }

    [HttpPost("create-payment")]
    public async Task<IActionResult> CreatePayment([FromBody] PaymentRequest request)
    {
        // 1. Lấy thông tin User
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized("Bác chưa đăng nhập!");
        int userId = int.Parse(userIdClaim.Value);

        OrderModel order; // Khai báo ở ngoài để bên dưới có thể dùng chung

        // 2. Xử lý logic tạo mới hoặc lấy lại đơn cũ
        if (request.OrderId == 0)
        {
            var course = await _context.Courses.FindAsync(request.CourseId);
            if (course == null) return NotFound("Không thấy khóa học này.");

            // Kiểm tra xem đã mua chưa (Tránh spam đơn hàng)
            var exists = await _context.Orders.AnyAsync(o => o.UserId == userId && o.CourseId == request.CourseId && o.Status == OrderStatusEnum.Success);
            if (exists) return BadRequest(new { message = "Bác đã sở hữu khóa học này rồi!" });

            order = new OrderModel
            {
                UserId = userId,
                CourseId = request.CourseId,
                Amount = (decimal)course.Price,
                OrderDescription = $"Thanh toan khoa hoc: {course.Title}",
                Status = OrderStatusEnum.Pending,
                CreatedAt = DateTime.Now
            };
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();
        }
        else
        {
            // Thanh toán lại cho đơn hàng cũ (Nút "Thanh toán ngay" ở trang Order)
            order = await _context.Orders.FindAsync(request.OrderId);
            if (order == null || order.UserId != userId) return NotFound("Đơn hàng không hợp lệ.");
            if (order.Status == OrderStatusEnum.Success) return BadRequest(new { message = "Đơn này thanh toán rồi bác ơi!" });

            // Cập nhật lại ngày tạo để không bị hết hạn request VNPay
            order.CreatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
        }

        // 3. Cấu hình VNPay
        string tmnCode = _configuration["Vnpay:TmnCode"];
        string hashSecret = _configuration["Vnpay:HashSecret"];
        string baseUrl = _configuration["Vnpay:BaseUrl"];
        string returnUrl = _configuration["Vnpay:ReturnUrl"];

        var vnpay = new VnPayLibrary();
        vnpay.AddRequestData("vnp_Version", "2.1.0");
        vnpay.AddRequestData("vnp_Command", "pay");
        vnpay.AddRequestData("vnp_TmnCode", tmnCode);

        // VNPay yêu cầu số tiền nhân 100 và KHÔNG ĐƯỢC CÓ DẤU PHẨY (dùng định dạng số nguyên)
        long vnpAmount = (long)(order.Amount * 100);
        vnpay.AddRequestData("vnp_Amount", vnpAmount.ToString());

        vnpay.AddRequestData("vnp_CreateDate", order.CreatedAt.ToString("yyyyMMddHHmmss"));
        vnpay.AddRequestData("vnp_CurrCode", "VND");
        vnpay.AddRequestData("vnp_IpAddr", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1");
        vnpay.AddRequestData("vnp_Locale", "vn");
        vnpay.AddRequestData("vnp_OrderInfo", order.OrderDescription);
        vnpay.AddRequestData("vnp_OrderType", "other");
        vnpay.AddRequestData("vnp_ReturnUrl", returnUrl);
        vnpay.AddRequestData("vnp_TxnRef", order.Id.ToString());

        string paymentUrl = vnpay.CreateRequestUrl(baseUrl, hashSecret);

        return Ok(new { paymentUrl });
    }

    // Thêm Class này để nhận dữ liệu từ JSON body
    public class PaymentRequest
    {
        public int CourseId { get; set; }
        public int OrderId { get; set; }
    }

    [HttpGet("vnpay-callback")]
    public async Task<IActionResult> PaymentCallback()
    {
        var queryData = Request.Query;
        var vnpay = new VnPayLibrary();
        string hashSecret = _configuration["Vnpay:HashSecret"];

        foreach (var (key, value) in queryData)
        {
            if (!string.IsNullOrEmpty(key) && key.StartsWith("vnp_"))
            {
                vnpay.AddResponseData(key, value);
            }
        }

        int orderId = int.Parse(vnpay.GetResponseData("vnp_TxnRef"));
        string vnp_ResponseCode = vnpay.GetResponseData("vnp_ResponseCode");
        string vnp_TransactionNo = vnpay.GetResponseData("vnp_TransactionNo");
        string vnp_SecureHash = queryData["vnp_SecureHash"];

        bool isSignatureValid = vnpay.ValidateSignature(vnp_SecureHash, hashSecret);

        if (isSignatureValid)
        {
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null) return NotFound("Đơn hàng không tồn tại.");

            // Kiểm tra xem đơn hàng đã được xử lý chưa (đề phòng VNPay gọi IPN nhiều lần)
            if (order.Status != OrderStatusEnum.Pending)
            {
                return Redirect($"http://127.0.0.1:5500/pages/course/detail.html?id={order.CourseId}");
            }

            // TRƯỜNG HỢP 1: THANH TOÁN THÀNH CÔNG
            if (vnp_ResponseCode == "00")
            {
                order.Status = OrderStatusEnum.Success;
                order.VnpayTranNo = vnp_TransactionNo;

                var enrollDto = new EnrollRequestDTO { CourseId = order.CourseId };
                await _enrollmentService.AddEnrollAsync(order.UserId, enrollDto);
                await _context.SaveChangesAsync();

                return Redirect("http://127.0.0.1:5500/pages/payment/payment-success.html");
            }
            // TRƯỜNG HỢP 2: NGƯỜI DÙNG NHẤN HỦY (MÃ 24)
            else if (vnp_ResponseCode == "24")
            {
                order.Status = OrderStatusEnum.Cancelled; // Cập nhật Enum đã thêm
                await _context.SaveChangesAsync();

                // Redirect về trang Detail và kèm param để Frontend hiện SweetAlert thông báo hủy
                return Redirect($"http://127.0.0.1:5500/pages/course/detail.html?id={order.CourseId}&paymentStatus=cancel");
            }
            // TRƯỜNG HỢP 3: CÁC LỖI KHÁC (THẺ SAI, KHÔNG ĐỦ TIỀN, HẾT HẠN...)
            else
            {
                order.Status = OrderStatusEnum.Failed;
                await _context.SaveChangesAsync();

                return Redirect($"http://127.0.0.1:5500/pages/course/detail.html?id={order.CourseId}&paymentStatus=fail");
            }
        }

        return BadRequest("Chữ ký không hợp lệ.");
    }
}