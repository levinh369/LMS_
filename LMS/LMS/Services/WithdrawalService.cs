using LMS.Data;
using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Services
{
    public class WithdrawalService : IWithdrawalService
    {
        private readonly IWithDrawRepository _withdrawRepo;
        private readonly IUserRepository _userRepo;
        private readonly INotificationService _notificationService;
        private readonly ApplicationDbContext _context;
        public WithdrawalService(
            IWithDrawRepository withdrawRepo,
            IUserRepository userRepo,
            INotificationService notificationService, ApplicationDbContext dbContext)
        {
            _withdrawRepo = withdrawRepo;
            _userRepo = userRepo;
            _notificationService = notificationService;
            _context = dbContext;
        }

        public async Task<(bool IsSuccess, string Message)> CreateWithdrawalRequestAsync(int teacherId, WithdrawRequestDTO requestDto)
        {
            var teacher = await _userRepo.GetByIdAsync(teacherId);
            if (teacher == null) return (false, "Không tìm thấy thông tin tài khoản.");

            if (teacher.WalletBalance < requestDto.Amount)
                return (false, "Số dư trong ví không đủ để thực hiện giao dịch này.");

            try
            {
                // Giam tiền ví
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
                string uniqueUrl = $"/admin/withdrawals?id={withdrawalRecord.Id}";
                await _notificationService.SendNotificationAsync(
                    1029, teacher.Id, msg, NotificationTypeEnum.WithdrawalRequest, uniqueUrl, null);

                return (true, "Tạo lệnh rút tiền thành công. Vui lòng chờ Admin phê duyệt!");
            }
            catch (Exception)
            {
                return (false, "Lỗi hệ thống khi xử lý giao dịch. Vui lòng thử lại sau.");
            }
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
                CreatedAt = w.CreatedAt
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

                    request.User.WalletBalance += request.Amount;
                    await _userRepo.UpdateAsync(request.User);
                    teacherNotifMsg = $"Lệnh rút <b>{request.Amount:N0} VNĐ</b> bị từ chối. Lý do: {dto.Note}. Tiền đã được hoàn lại vào ví.";
                }

                await _withdrawRepo.UpdateAsync(request);
                await _withdrawRepo.SaveChangesAsync(); 
                await _notificationService.SendNotificationAsync(
                    request.UserId, adminId, teacherNotifMsg, NotificationTypeEnum.WithdrawalRequest, "/teacher/wallet", null);

                return (true, dto.IsApproved ? "Xác nhận chuyển tiền thành công!" : "Đã hủy lệnh và hoàn tiền.");
            }
            catch (Exception)
            {
                return (false, "Lỗi hệ thống khi xử lý. Vui lòng thử lại sau.");
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
                                      Note = w.Note
                                  }).ToListAsync();

            return (data, total);
        }
    }
}
