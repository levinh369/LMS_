using ClosedXML.Excel;
using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Drawing;

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
            // Bác nhớ đảm bảo hàm GetOrderDetailsByIdAsync có .Include(o => o.Course).ThenInclude(c => c.User) nhé
            var o = await _orderRepository.GetOrderDetailsByIdAsync(orderId);
            if (o == null) return null;

            return new OrderAdminDetailDTO
            {
                OrderId = o.Id,
                OrderCode = $"ORD-{o.Id}",
                CustomerName = o.User?.FullName ?? "N/A",
                CustomerEmail = o.User?.Email ?? "N/A",
                CourseTitle = o.Course?.Title ?? "N/A",
                TeacherName = o.Course?.Teacher?.FullName ?? "N/A",

                TotalAmount = o.Amount,
                AdminAmount = o.AdminAmount,
                TeacherAmount = o.TeacherAmount,
                AppliedRate = o.AppliedRate,

                Status = o.Status.ToString(),
                CreatedAt = o.CreatedAt,
                OrderDescription = o.OrderDescription,
                TransactionId = o.VnpayTranNo ?? "N/A",
                TranSactionStatus = o.Vnp_TransactionStatus ?? "N/A"
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
   int status, int teacherId)
        {
            // 1. Gọi Repository để lấy dữ liệu thực thể (Entities) và tổng số bản ghi
            var (entities, total) = await _orderRepository.GetPagedAsync(page, pageSize, keySearch, fromDate, toDate, status, teacherId);

            // 2. Map từ List<OrderModel> sang List<OrderResponeDTO>
            var dtoList = entities.Select(o => new OrderResponeDTO
            {
                OrderId = o.Id,
                OrderCode = $"ORD-{o.Id}",
                CustomerName = o.User?.FullName ?? "Khách hàng ẩn danh",
                CustomerEmail = o.User?.Email ?? "N/A",
                CourseTitle = o.Course?.Title ?? "Khóa học đã bị xóa", // Phòng xa luôn nếu Course bị null
                TotalAmount = o.Amount,
                Status = o.Status.ToString(),
                CreatedAt = o.CreatedAt,
                AvatarUrl = o.User?.AvatarUrl ?? "/assets/img/default-avatar.png" // SỬA Ở ĐÂY: Thêm dấu ? phòng vệ chặt chẽ!
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
        public async Task<byte[]> ExportOrdersToExcelAsync(
      string keySearch, DateTime? fromDate, DateTime? toDate, int status, int filterTeacherId)
        {
            // 1. Lấy toàn bộ danh sách thỏa mãn bộ lọc 
            var orders = await _orderRepository.GetAllOrdersForExportAsync(keySearch, fromDate, toDate, status, filterTeacherId);

            // 2. Khởi tạo Workbook Excel
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Danh sách đơn hàng");

                // 3. Tạo Tiêu đề to nằm trên cùng
                worksheet.Cell(1, 1).Value = "BÁO CÁO CHI TIẾT DANH SÁCH ĐƠN HÀNG VÀ DOANH THU";
                worksheet.Cell(1, 1).Style.Font.Bold = true;
                worksheet.Cell(1, 1).Style.Font.FontSize = 16; // 📍 Đã sửa: FontSize
                worksheet.Range(1, 1, 1, 8).Merge(); // 📍 Tăng lên 8 cột vì thêm Tên khóa học

                // 4. Định nghĩa Header của bảng
                string[] headers = { "STT", "Mã Đơn Hàng", "Tên Học Viên", "Email", "Tên Khóa Học", "Ngày Thanh Toán", "Tổng Tiền", "Trạng Thái" };
                for (int i = 0; i < headers.Length; i++)
                {
                    var cell = worksheet.Cell(3, i + 1);
                    cell.Value = headers[i];
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1f4e78");
                    cell.Style.Font.FontColor = XLColor.White; // 📍 Đã sửa: FontColor
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                }

                // 5. Đổ dữ liệu Data vòng lặp vào từng hàng
                int currentRow = 4;
                int stt = 1;
                foreach (var order in orders)
                {
                    worksheet.Cell(currentRow, 1).Value = stt++;
                    worksheet.Cell(currentRow, 2).Value = $"#ORD{order.Id}";
                    worksheet.Cell(currentRow, 3).Value = order.User?.FullName ?? "N/A";
                    worksheet.Cell(currentRow, 4).Value = order.User?.Email ?? "N/A";

                    // 📍 Thêm cột Khóa học vào giữa
                    worksheet.Cell(currentRow, 5).Value = order.Course?.Title ?? "N/A";

                    worksheet.Cell(currentRow, 6).Value = order.CreatedAt.ToString("dd/MM/yyyy HH:mm");

                    // Đổ số tiền vào cột 7 (Cột G)
                    worksheet.Cell(currentRow, 7).Value = order.Amount;
                    worksheet.Cell(currentRow, 7).Style.NumberFormat.Format = "#,##0\" đ\"";
                    string statusText = order.Status switch
                    {
                        OrderStatusEnum.Pending => "Chờ thanh toán",
                        OrderStatusEnum.Success => "Thành công",
                        OrderStatusEnum.Failed => "Lỗi thanh toán",
                        OrderStatusEnum.Cancelled => "Đã hủy",
                        OrderStatusEnum.Refunded => "Đã hoàn tiền",
                        _ => "Không rõ"
                    };
                    worksheet.Cell(currentRow, 8).Value = statusText;

                    // Kẻ viền cho đủ 8 cột
                    worksheet.Row(currentRow).Cells(1, 8).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    worksheet.Row(currentRow).Cells(1, 8).Style.Border.InsideBorder = XLBorderStyleValues.Thin;

                    currentRow++;
                }
                decimal totalRevenue = orders.Where(x => x.Status == OrderStatusEnum.Success).Sum(x => x.Amount);

                int totalRow = currentRow + 1;
                worksheet.Cell(totalRow, 6).Value = "TỔNG DOANH THU THỰC TẾ:";
                worksheet.Cell(totalRow, 6).Style.Font.Bold = true;

                // Ném thẳng con số đã tính bằng C# vào ô Excel (Không dùng Formula nữa)
                worksheet.Cell(totalRow, 7).Value = totalRevenue;
                worksheet.Cell(totalRow, 7).Style.Font.Bold = true;
                worksheet.Cell(totalRow, 7).Style.Font.FontColor = XLColor.Red;
                worksheet.Cell(totalRow, 7).Style.NumberFormat.Format = "#,##0\" đ\"";
                // Tự động căn chỉnh độ rộng các cột vừa khít với độ dài chữ
                worksheet.Columns().AdjustToContents();

                // 7. Lưu workbook ra bộ nhớ Stream và trả về chuỗi byte
                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }
    }
}