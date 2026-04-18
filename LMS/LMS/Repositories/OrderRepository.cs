using LMS.Data;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class OrderRepository : BaseRepository<OrderModel>, IOrderRepository
    {
        public OrderRepository(ApplicationDbContext context) : base(context)
        {
        }
        public async Task<IEnumerable<OrderModel>> GetAllOrdersWithDetailsAsync()
        {
            return await _context.Orders
                .Include(o => o.User)   // JOIN bảng Users
                .Include(o => o.Course) // JOIN bảng Courses
                .ToListAsync();
        }

        public async Task<OrderModel?> GetOrderDetailsByIdAsync(int orderId)
        {
            return await _context.Orders.Include(o => o.User).Include(o => o.Course).Where(o=>o.Id == orderId).FirstOrDefaultAsync();
        }
        public async Task<(List<OrderModel> Data, int Total)> GetPagedAsync(
            int page,
            int pageSize,
            string keySearch,
            DateTime? fromDate,
            DateTime? toDate,
            int status)
        {
            // 1. Khởi tạo query và Include luôn để tránh Null
            var query = _context.Orders
                .Include(o => o.User)
                .Include(o => o.Course)
                .AsNoTracking()
                .Where(c => !c.IsDeleted);

            // 2. Tìm kiếm theo Tên khách hàng hoặc Mã đơn (nếu keySearch là số)
            if (!string.IsNullOrEmpty(keySearch))
            {
                query = query.Where(d => d.User.FullName.Contains(keySearch)
                                      || d.Id.ToString().Contains(keySearch));
            }

            // 3. Lọc theo ngày
            if (fromDate.HasValue)
                query = query.Where(d => d.CreatedAt >= fromDate.Value);

            if (toDate.HasValue)
                // Lưu ý: toDate nên tính đến cuối ngày (23:59:59)
                query = query.Where(d => d.CreatedAt <= toDate.Value.AddDays(1).AddTicks(-1));

            // 4. Lọc theo trạng thái (status truyền từ FE là -1, 0, 1, 2, 3)
            if (status != -1)
            {
                // Ép kiểu int sang Enum OrderStatusEnum
                var statusEnum = (OrderStatusEnum)status;
                query = query.Where(d => d.Status == statusEnum);
            }

            // 5. Đếm tổng số bản ghi trước khi phân trang
            int total = await query.CountAsync();

            // 6. Lấy dữ liệu phân trang
            var data = await query
                .OrderByDescending(d => d.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
        }
    }
}
