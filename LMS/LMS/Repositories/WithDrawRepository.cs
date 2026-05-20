using LMS.Data;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class WithDrawRepository : IWithDrawRepository
    {
        private readonly ApplicationDbContext _context;

        public WithDrawRepository(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task<WithdrawalRequestModel> GetByIdAsync(int id)
        {
            // Include bảng User để tí Service có dữ liệu hoàn tiền + gửi Notif
            return await _context.WithdrawalRequests
                .Include(w => w.User)
                .FirstOrDefaultAsync(w => w.Id == id);
        }

        public async Task AddAsync(WithdrawalRequestModel request)
        {
            await _context.WithdrawalRequests.AddAsync(request);
        }

        public async Task UpdateAsync(WithdrawalRequestModel request)
        {
            _context.WithdrawalRequests.Update(request);
            await Task.CompletedTask; // Bản chất hàm Update của EF là đồng bộ, nên bọc lại cho đúng chuẩn Task
        }

        public async Task<(List<WithdrawalRequestModel> Data, int Total)> GetListForAdminAsync(
            string keyword, int status, DateTime? fromDate, DateTime? toDate, int pageIndex, int pageSize)
        {
            var query = _context.WithdrawalRequests
                .Include(w => w.User)
                .AsQueryable();

            // 1. Lọc từ khóa
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                keyword = keyword.ToLower();
                query = query.Where(w =>
                    w.Id.ToString() == keyword ||
                    w.User.FullName.ToLower().Contains(keyword) ||
                    w.User.Email.ToLower().Contains(keyword));
            }

            // 2. Lọc trạng thái (-1 là tất cả)
            if (status != -1)
            {
                var enumStatus = (WithdrawalStatusEnum)status;
                query = query.Where(w => w.Status == enumStatus);
            }

            // 3. Lọc ngày
            if (fromDate.HasValue)
                query = query.Where(w => w.CreatedAt.Date >= fromDate.Value.Date);

            if (toDate.HasValue)
                query = query.Where(w => w.CreatedAt.Date <= toDate.Value.Date);

            // 4. Đếm tổng số
            int total = await query.CountAsync();

            // 5. Phân trang & Sắp xếp (Chờ duyệt lên đầu)
            var data = await query
                .OrderBy(w => w.Status == WithdrawalStatusEnum.Pending ? 0 : 1)
                .ThenByDescending(w => w.CreatedAt)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
        }

        public async Task<(List<WithdrawalRequestModel> Data, int TotalCount)> GetHistoryByTeacherIdAsync(
            int teacherId, int pageIndex, int pageSize)
        {
            var query = _context.WithdrawalRequests
                .Where(w => w.UserId == teacherId);

            int total = await query.CountAsync();

            var data = await query
                .OrderByDescending(w => w.CreatedAt)
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
        
    }
}
