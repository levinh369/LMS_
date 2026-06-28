using ClosedXML.Excel;
using LMS.Data;
using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Hub;
using LMS.Models;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Transactions;

namespace LMS.Services
{
    public class WithdrawalService : IWithdrawalService
    {
        private readonly IWithDrawRepository _withdrawRepo;
        private readonly IUserRepository _userRepo;
        private readonly INotificationService _notificationService;
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IDashboardService _dashboardService;
        public WithdrawalService(
            IWithDrawRepository withdrawRepo,
            IUserRepository userRepo,
            INotificationService notificationService, ApplicationDbContext dbContext, IHubContext<NotificationHub> hubContext, IDashboardService dashboardService)
        {
            _withdrawRepo = withdrawRepo;
            _userRepo = userRepo;
            _notificationService = notificationService;
            _context = dbContext;
            _hubContext = hubContext;
            _dashboardService = dashboardService;
        }

       
        public async Task<(List<WithdrawalResponseDTO> Data, int Total)> GetTeacherHistoryAsync(int teacherId, int pageIndex, int pageSize)
        {
            var result = await _withdrawRepo.GetHistoryByTeacherIdAsync(teacherId, pageIndex, pageSize);

            var dtoList = result.Data.Select(w => new WithdrawalResponseDTO
            {
                Id = w.Id,
                Amount = w.Amount,
                BankName = w.BankName,
                AccountNumber = w.AccountNumber,
                AccountName = w.AccountName,
                Status = (int)w.Status,
                Note = w.Note,
                CreatedAt = w.CreatedAt,
            }).ToList();

            return (dtoList, result.TotalCount);
        }

        public async Task<(List<WithdrawalResponseDTO> Data, int Total)> GetAdminWithdrawalsAsync(
            string keyword, int status, DateTime? fromDate, DateTime? toDate, int pageIndex, int pageSize)
        {
            var result = await _withdrawRepo.GetListForAdminAsync(keyword, status, fromDate, toDate, pageIndex, pageSize);

            var dtoList = result.Data.Select(w => new WithdrawalResponseDTO
            {
                Id = w.Id,
                TeacherId = w.UserId,
                TeacherName = w.User?.FullName ?? "N/A",
                TeacherEmail = w.User?.Email ?? "N/A",
                Amount = w.Amount,
                BankName = w.BankName,
                AccountNumber = w.AccountNumber,
                AccountName = w.AccountName,
                Status = (int)w.Status,
                Note = w.Note,
                CreatedAt = w.CreatedAt
            }).ToList();

            return (dtoList, result.Total);
        }
        public async Task<(bool IsSuccess, string Message)> ProcessWithdrawalAsync(int adminId, ProcessWithdrawalDTO dto)
        {
            var request = await _withdrawRepo.GetByIdAsync(dto.WithdrawalId);
            if (request == null) return (false, "Không tìm thấy yêu cầu rút tiền này.");
            if (request.Status != WithdrawalStatusEnum.Pending) return (false, "Yêu cầu này đã được xử lý.");

            try
            {
                string teacherNotifMsg = "";
                int withdrawalId = request.Id;

                using (var transaction = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
                {
                    if (dto.IsApproved)
                    {
                        request.Status = WithdrawalStatusEnum.Approved;
                        teacherNotifMsg = $"Ting ting! Lệnh rút <b>{request.Amount:N0} VNĐ</b> đã được xử lý thành công. Vui lòng kiểm tra tài khoản ngân hàng.";
                    }
                    else
                    {
                        if (string.IsNullOrWhiteSpace(dto.Note))
                            return (false, "Vui lòng nhập lý do từ chối.");

                        request.Status = WithdrawalStatusEnum.Rejected;
                        request.Note = dto.Note;

                        // Trả lại tiền vào ví cho giảng viên
                        request.User.WalletBalance += request.Amount;
                        await _userRepo.UpdateAsync(request.User);

                        teacherNotifMsg = $"Lệnh rút <b>{request.Amount:N0} VNĐ</b> bị từ chối. Lý do: {dto.Note}. Tiền đã được hoàn lại vào ví.";
                    }

                    // Cập nhật trạng thái đơn rút tiền
                    await _withdrawRepo.UpdateAsync(request);
                    await _withdrawRepo.SaveChangesAsync();
                    transaction.Complete();
                }

                string uniqueUrl = $"/teacher/teacher-wallet.html?action=view_detail&id={withdrawalId}";

                await _notificationService.SendNotificationAsync(
                    request.UserId,
                    adminId,
                    teacherNotifMsg,
                    NotificationTypeEnum.WithdrawalRequest,
                    uniqueUrl,
                    null
                );

                // ==========================================
                // BẮN TÍN HIỆU SIGNALR ĐỂ GIẢM SỐ ĐẾM CHẤM ĐỎ CỦA ADMIN
                // ==========================================
                try
                {
                    var pendingCounts = await _dashboardService.GetPendingCountsAsync();
                    await _hubContext.Clients.Group("AdminGroup")
                        .SendAsync("ReceiveAdminNotificationCount", pendingCounts.WithdrawCount, pendingCounts.TeacherCount);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[SignalR Error] Lỗi khi bắn đếm số (ProcessWithdrawal): {ex.Message}");
                }

                return (true, dto.IsApproved ? "Xác nhận chuyển tiền thành công!" : "Đã hủy lệnh và hoàn tiền.");
            }
            catch (Exception ex)
            {
                return (false, "Lỗi hệ thống khi xử lý: " + ex.Message);
            }
        }
        public async Task<TeacherWalletStatsDTO> GetTeacherWalletStatsAsync(int teacherId)
        {
            var teacher = await _context.Users.FindAsync(teacherId);
            if (teacher == null) return new TeacherWalletStatsDTO();

            var withdrawals = await _context.WithdrawalRequests
                .Where(w => w.UserId == teacherId)
                .ToListAsync();

            return new TeacherWalletStatsDTO
            {
                AvailableBalance = teacher.WalletBalance,
                PendingAmount = withdrawals.Where(w => w.Status == WithdrawalStatusEnum.Pending).Sum(w => w.Amount),
                PendingCount = withdrawals.Count(w => w.Status == WithdrawalStatusEnum.Pending),
                TotalWithdrawn = withdrawals.Where(w => w.Status == WithdrawalStatusEnum.Approved).Sum(w => w.Amount)
            };
        }

        public async Task<(List<WithdrawalHistoryDTO> Data, int Total)> GetTeacherHistoryAsync(int teacherId, int pageIndex, int pageSize, int status = -1)
        {
            var query = _context.WithdrawalRequests.Where(w => w.UserId == teacherId).AsQueryable();

            if (status != -1) query = query.Where(w => w.Status == (WithdrawalStatusEnum)status);

            int total = await query.CountAsync();

            var data = await query.OrderByDescending(w => w.CreatedAt)
                                  .Skip((pageIndex - 1) * pageSize)
                                  .Take(pageSize)
                                  .Select(w => new WithdrawalHistoryDTO
                                  {
                                      Id = w.Id,
                                      Amount = w.Amount,
                                      BankName = w.BankName,
                                      AccountNumber = w.AccountNumber,
                                      CreatedAt = w.CreatedAt,
                                      Status = (int)w.Status,
                                      Note = w.Note,
                                      AdminNote = w.AdminNote
                                  }).ToListAsync();

            return (data, total);
        }

        public async Task<WithdrawalDetailResponseDTO> GetWithdrawalDetail(int id)
        {
            var entity = await _withdrawRepo.GetByIdAsync(id);
            if (entity == null)
            {
                return null; 
            }

            // Map thủ công từ Entity gốc sang DTO
            var dto = new WithdrawalDetailResponseDTO
            {
                Id = entity.Id,
                Amount = entity.Amount,
                Status = (int)entity.Status,
                CreatedAt = entity.CreatedAt,
                BankName = entity.BankName,
                AccountNumber = entity.AccountNumber,
                AccountName = entity.AccountName,
                Note = entity.Note,
                DisputeReason = entity.DisputeReason,
                AdminNote = entity.AdminNote
            };

            return dto;
        }
        public async Task<(bool IsSuccess, string Message)> CreateWithdrawalRequestAsync(int teacherId, WithdrawRequestDTO requestDto)
        {
            var teacher = await _userRepo.GetByIdAsync(teacherId);
            if (teacher == null) return (false, "Không tìm thấy thông tin tài khoản.");

            if (teacher.WalletBalance < requestDto.Amount)
                return (false, "Số dư trong ví không đủ để thực hiện giao dịch này.");

            try
            {
                // Giảm tiền ví
                teacher.WalletBalance -= requestDto.Amount;

                var withdrawalRecord = new WithdrawalRequestModel
                {
                    UserId = teacherId,
                    Amount = requestDto.Amount,
                    BankName = requestDto.BankName,
                    AccountNumber = requestDto.AccountNumber,
                    AccountName = requestDto.AccountName.Trim().ToUpper(),
                    Status = WithdrawalStatusEnum.Pending,
                    CreatedAt = DateTime.Now
                };

                await _withdrawRepo.AddAsync(withdrawalRecord);
                await _userRepo.UpdateAsync(teacher);
                await _withdrawRepo.SaveChangesAsync();

                string msg = $"Giảng viên <b>{teacher.FullName}</b> vừa đặt lệnh rút {requestDto.Amount:N0} VNĐ.";
                string uniqueUrl = $"/withDraw/index.html?action=new_request&id={withdrawalRecord.Id}";

                // ==========================================
                // 1. QUÉT TÌM ADMIN VÀ GỬI THÔNG BÁO (Bỏ fix cứng 1029)
                // ==========================================
                var adminRoleId = await _context.Roles
                    .Where(r => r.RoleName == "Admin")
                    .Select(r => r.Id)
                    .FirstOrDefaultAsync();

                if (adminRoleId > 0)
                {
                    var adminIds = await _context.Users
                        .Where(u => u.RoleId == adminRoleId)
                        .Select(u => u.Id)
                        .ToListAsync();

                    foreach (var adminId in adminIds)
                    {
                        await _notificationService.SendNotificationAsync(
                            adminId, teacher.Id, msg, NotificationTypeEnum.WithdrawalRequest, uniqueUrl, null);
                    }
                }

                // ==========================================
                // 2. ĐẾM COUNT VÀ BẮN SIGNALR REAL-TIME CẬP NHẬT GIAO DIỆN
                // ==========================================
                try
                {
                    var pendingCounts = await _dashboardService.GetPendingCountsAsync();
                    await _hubContext.Clients.Group("AdminGroup")
                        .SendAsync("ReceiveAdminNotificationCount", pendingCounts.WithdrawCount, pendingCounts.TeacherCount);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[SignalR Error] Lỗi khi bắn thông báo đếm số: {ex.Message}");
                }

                return (true, "Tạo lệnh rút tiền thành công. Vui lòng chờ Admin phê duyệt!");
            }
            catch (Exception)
            {
                return (false, "Lỗi hệ thống khi xử lý giao dịch. Vui lòng thử lại sau.");
            }
        }
        public async Task<ServiceResult> DisputeWithdrawal(int id, string reason)
        {
            var entity = await _withdrawRepo.GetByIdAsync(id);

            if (entity == null)
                return new ServiceResult { IsSuccess = false, Message = "Không tìm thấy giao dịch rút tiền." };
            if (entity.Status != WithdrawalStatusEnum.Approved)
                return new ServiceResult { IsSuccess = false, Message = "Chỉ giao dịch đã báo Hoàn tất mới có thể khiếu nại." };

            // 1. Cập nhật trạng thái đơn
            entity.Status = WithdrawalStatusEnum.Disputed;
            entity.DisputeReason = reason;
            _withdrawRepo.Update(entity);
            await _withdrawRepo.SaveChangesAsync();

            int senderId = entity.UserId;

            string msg = $"Giảng viên báo lỗi chưa nhận được tiền cho giao dịch <b>#WD{id}</b>. Lý do: {reason}";
            string uniqueUrl = $"/withDraw/index.html?action=view_dispute&id={id}";

            // ==========================================
            // 2. QUÉT TÌM ADMIN VÀ GỬI THÔNG BÁO (Đã bỏ 1029)
            // ==========================================
            var adminRoleId = await _context.Roles
                .Where(r => r.RoleName == "Admin")
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (adminRoleId > 0)
            {
                var adminIds = await _context.Users
                    .Where(u => u.RoleId == adminRoleId)
                    .Select(u => u.Id)
                    .ToListAsync();

                foreach (var adminId in adminIds)
                {
                    await _notificationService.SendNotificationAsync(
                        adminId,
                        senderId,
                        msg,
                        NotificationTypeEnum.WithdrawalDispute,
                        uniqueUrl,
                        null
                    );
                }
            }

            // ==========================================
            // 3. ĐẾM COUNT VÀ BẮN SIGNALR REAL-TIME 
            // ==========================================
            try
            {
                // Nhảy số chấm đỏ để Admin biết có đơn khiếu nại cần xử lý
                var pendingCounts = await _dashboardService.GetPendingCountsAsync();
                await _hubContext.Clients.Group("AdminGroup")
                    .SendAsync("ReceiveAdminNotificationCount", pendingCounts.WithdrawCount, pendingCounts.TeacherCount);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignalR Error] Lỗi khi bắn thông báo khiếu nại: {ex.Message}");
            }

            return new ServiceResult { IsSuccess = true, Message = "Gửi báo lỗi thành công." };
        }
        public async Task<WithdrawalDetailResponseDTO> GetWithdrawalDetailForAdmin(int id)
        {
            var entity = await _withdrawRepo.GetByIdAsync(id);

            if (entity == null)
            {
                return null;
            }
            var dto = new WithdrawalDetailResponseDTO
            {
                Id = entity.Id,
                Amount = entity.Amount,
                Status = (int)entity.Status, 
                CreatedAt = entity.CreatedAt,
                BankName = entity.BankName,
                AccountNumber = entity.AccountNumber,
                AccountName = entity.AccountName,
                TeacherName = entity.User != null ? entity.User.FullName : "Không xác định",
                TeacherEmail = entity.User != null ? entity.User.Email : "---",

                Note = entity.Note,
                DisputeReason = entity.DisputeReason,
                AdminNote = entity.AdminNote
            };

            return dto;
        }
        public async Task<ServiceResult> RollbackWithdrawalAsync(int id, int adminId, string adminNote)
        {
            // 1. Lấy thông tin đơn rút tiền
            var withdrawal = await _withdrawRepo.GetByIdAsync(id);
            if (withdrawal == null)
                return new ServiceResult { IsSuccess = false, Message = "Không tìm thấy giao dịch rút tiền." };
            if (withdrawal.Status != WithdrawalStatusEnum.Disputed && withdrawal.Status != WithdrawalStatusEnum.Approved)
                return new ServiceResult { IsSuccess = false, Message = "Trạng thái đơn không hợp lệ để hoàn tiền." };
            var teacher = await _userRepo.GetByIdAsync(withdrawal.UserId);
            if (teacher == null)
                return new ServiceResult { IsSuccess = false, Message = "Không tìm thấy tài khoản giảng viên." };

            try
            {
                using (var transaction = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
                {
                    // Bước 3.1: Trả lại tiền vào ví
                    teacher.WalletBalance += withdrawal.Amount;
                    await _userRepo.UpdateAsync(teacher);
                    withdrawal.Status = WithdrawalStatusEnum.Refunded;
                    withdrawal.AdminNote = adminNote;
                    await _withdrawRepo.UpdateAsync(withdrawal); 
                    transaction.Complete();
                }
                string msg = $"Lệnh rút tiền <b>#WD{id}</b> đã được xử lý. Số tiền <b>{withdrawal.Amount:N0}đ</b> đã được hoàn lại vào ví của bạn. Lý do: {adminNote}";
                string uniqueUrl = $"/teacher/teacher-wallet.html?action=view_detail&id={id}";

                await _notificationService.SendNotificationAsync(
                    withdrawal.UserId,
                    adminId,
                    msg,
                    (NotificationTypeEnum)11,
                    uniqueUrl,
                    null
                );

                return new ServiceResult { IsSuccess = true, Message = "Hoàn tiền vào ví thành công!" };
            }
            catch (Exception ex)
            {
                return new ServiceResult { IsSuccess = false, Message = "Lỗi hệ thống khi xử lý hoàn tiền: " + ex.Message };
            }
        }
        public byte[] ExportWithdrawalsToExcel(List<WithdrawalRequestModel> list)
        {
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Danh sách rút tiền");

                // 1. Tiêu đề lớn nằm trên cùng file
                worksheet.Cell(1, 1).Value = "BÁO CÁO CHI TIẾT CÁC LỆNH RÚT TIỀN GIẢNG VIÊN";
                worksheet.Cell(1, 1).Style.Font.Bold = true;
                worksheet.Cell(1, 1).Style.Font.FontSize = 16;
                worksheet.Range(1, 1, 1, 8).Merge(); // Gộp 8 cột làm tiêu đề

                // 2. Định nghĩa Header của bảng (Màu xanh lá cây đặc trưng của tài chính)
                string[] headers = { "STT", "Tên Giảng Viên", "Ngân Hàng", "Số Tài Khoản", "Chủ Tài Khoản", "Số Tiền Rút", "Ngày Yêu Cầu", "Trạng Thái" };
                for (int i = 0; i < headers.Length; i++)
                {
                    var cell = worksheet.Cell(3, i + 1);
                    cell.Value = headers[i];
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.BackgroundColor = XLColor.ForestGreen;
                    cell.Style.Font.FontColor = XLColor.White;
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                }

                // 3. Đổ dữ liệu vòng lặp vào từng hàng
                int currentRow = 4;
                int stt = 1;
                foreach (var item in list)
                {
                    worksheet.Cell(currentRow, 1).Value = stt++;
                    worksheet.Cell(currentRow, 2).Value = item.User?.FullName ?? "N/A";
                    worksheet.Cell(currentRow, 3).Value = item.BankName ?? "N/A";
                    worksheet.Cell(currentRow, 4).Value = item.AccountNumber ?? "N/A";
                    worksheet.Cell(currentRow, 5).Value = item.AccountName ?? "N/A";

                    // 📍 Ép hẳn sang decimal để kích nổ định dạng SỐ của Excel
                    worksheet.Cell(currentRow, 6).Value = Convert.ToDecimal(item.Amount);
                    worksheet.Cell(currentRow, 6).Style.NumberFormat.Format = "#,##0\\ đ";

                    worksheet.Cell(currentRow, 7).Value = item.CreatedAt.ToString("dd/MM/yyyy HH:mm");

                    // Khớp chuẩn xác 5 trạng thái Enum với dữ liệu thực tế
                    string statusText = item.Status switch
                    {
                        WithdrawalStatusEnum.Pending => "Chờ duyệt",
                        WithdrawalStatusEnum.Approved => "Đã duyệt",
                        WithdrawalStatusEnum.Rejected => "Đã từ chối",
                        WithdrawalStatusEnum.Disputed => "Đang khiếu nại",
                        WithdrawalStatusEnum.Refunded => "Đã hoàn tiền",
                        _ => "Không xác định"
                    };
                    worksheet.Cell(currentRow, 8).Value = statusText;

                    // Kẻ viền (Border) mỏng bao quanh các ô tính dữ liệu
                    worksheet.Row(currentRow).Cells(1, 8).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    worksheet.Row(currentRow).Cells(1, 8).Style.Border.InsideBorder = XLBorderStyleValues.Thin;

                    currentRow++;
                }

                // =========================================================================
                // 4. TÍNH TOÁN ĐA DÒNG TIỀN THEO ENUM ĐỂ ĐỐI SOÁT (Ép kiểu int chống lệch kiểu Enum)

                // Dòng 1: Tổng tiền thực tế ĐÃ CHI (Approved)
                decimal totalApproved = list.Where(x => (int)x.Status == (int)WithdrawalStatusEnum.Approved).Sum(x => Convert.ToDecimal(x.Amount));

                // Dòng 2: Tổng tiền lỗi QUAY ĐẦU (Refunded)
                decimal totalRefunded = list.Where(x => (int)x.Status == (int)WithdrawalStatusEnum.Refunded).Sum(x => Convert.ToDecimal(x.Amount));

                // Dòng 3: Tổng tiền TỪ CHỐI (Rejected)
                decimal totalRejected = list.Where(x => (int)x.Status == (int)WithdrawalStatusEnum.Rejected).Sum(x => Convert.ToDecimal(x.Amount));

                // Dòng 4: Tổng tiền ĐANG TRANH CHẤP (Disputed)
                decimal totalDisputed = list.Where(x => (int)x.Status == (int)WithdrawalStatusEnum.Disputed).Sum(x => Convert.ToDecimal(x.Amount));

                // Cách ra 1 hàng trống cho file thoáng mắt, dễ nhìn
                int startTotalRow = currentRow + 1;
                int currentTotalRow = startTotalRow;

                // ---- ĐỔ CÁC DÒNG TIỀN ĐỐI SOÁT VÀO FILE EXCEL ----

                // 1. Dòng tổng Approved (Màu đỏ - Tiền chi ra khỏi quỹ)
                worksheet.Cell(currentTotalRow, 5).Value = "1. TỔNG TIỀN ĐÃ DUYỆT CHI (APPROVED):";
                worksheet.Cell(currentTotalRow, 5).Style.Font.Bold = true;
                worksheet.Cell(currentTotalRow, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                worksheet.Cell(currentTotalRow, 6).Value = totalApproved;
                worksheet.Cell(currentTotalRow, 6).Style.Font.Bold = true;
                worksheet.Cell(currentTotalRow, 6).Style.Font.FontColor = XLColor.Red;
                worksheet.Cell(currentTotalRow, 6).Style.NumberFormat.Format = "#,##0\\ đ";
                currentTotalRow++;

                // 2. Dòng tổng Refunded (Màu cam - Tiền lỗi trả về ngân hàng, hoàn quỹ)
                worksheet.Cell(currentTotalRow, 5).Value = "2. TỔNG TIỀN LỖI HOÀN QUỸ (REFUNDED):";
                worksheet.Cell(currentTotalRow, 5).Style.Font.Bold = true;
                worksheet.Cell(currentTotalRow, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                worksheet.Cell(currentTotalRow, 6).Value = totalRefunded;
                worksheet.Cell(currentTotalRow, 6).Style.Font.Bold = true;
                worksheet.Cell(currentTotalRow, 6).Style.Font.FontColor = XLColor.Orange;
                worksheet.Cell(currentTotalRow, 6).Style.NumberFormat.Format = "#,##0\\ đ";
                currentTotalRow++;

                // 3. Dòng tổng Rejected (Màu xám - Tiền trả về ví giảng viên trên hệ thống)
                worksheet.Cell(currentTotalRow, 5).Value = "3. TỔNG TIỀN BỊ TỪ CHỐI (REJECTED):";
                worksheet.Cell(currentTotalRow, 5).Style.Font.Bold = true;
                worksheet.Cell(currentTotalRow, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                worksheet.Cell(currentTotalRow, 6).Value = totalRejected;
                worksheet.Cell(currentTotalRow, 6).Style.Font.Bold = true;
                worksheet.Cell(currentTotalRow, 6).Style.Font.FontColor = XLColor.Gray;
                worksheet.Cell(currentTotalRow, 6).Style.NumberFormat.Format = "#,##0\\ đ";
                currentTotalRow++;

                // 4. Dòng tổng Disputed (Màu đỏ đậm - Tiền rủi ro cao, đang khiếu nại)
                worksheet.Cell(currentTotalRow, 5).Value = "4. TỔNG TIỀN ĐANG KHIẾU NẠI (DISPUTED):";
                worksheet.Cell(currentTotalRow, 5).Style.Font.Bold = true;
                worksheet.Cell(currentTotalRow, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                worksheet.Cell(currentTotalRow, 6).Value = totalDisputed;
                worksheet.Cell(currentTotalRow, 6).Style.Font.Bold = true;
                worksheet.Cell(currentTotalRow, 6).Style.Font.FontColor = XLColor.DarkRed;
                worksheet.Cell(currentTotalRow, 6).Style.NumberFormat.Format = "#,##0\\ đ";

                // Kẻ khung viền dầy bao quanh khu vực đối soát tài chính 4 dòng tiền này
                var totalRange = worksheet.Range(startTotalRow, 5, currentTotalRow, 6);
                totalRange.Style.Border.OutsideBorder = XLBorderStyleValues.Medium;
                totalRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

                // Tự động căn chỉnh lại độ rộng toàn bộ cột cho vừa vặn chữ
                worksheet.Columns().AdjustToContents();

                // 5. Lưu workbook ra bộ nhớ tạm MemoryStream và trả về mảng byte
                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }
        public async Task<List<WithdrawalRequestModel>> GetAllWithdrawalsForExportAsync(string keySearch, int status, DateTime? fromDate, DateTime? toDate)
        {
            return await _withdrawRepo.GetAllWithdrawalsForExportAsync(keySearch, status,fromDate,toDate);
        }
    }
}
