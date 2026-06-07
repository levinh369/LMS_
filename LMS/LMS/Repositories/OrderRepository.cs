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
            return await _context.Orders.Include(o => o.User).Include(o => o.Course).ThenInclude(c => c.Teacher).Where(o=>o.Id == orderId).FirstOrDefaultAsync();
        }
        public async Task<(List<OrderModel> Data, int Total)> GetPagedAsync(
            int page,
            int pageSize,
            string keySearch,
            DateTime? fromDate,
            DateTime? toDate,
            int status, int teacherId)
        {
            // 1. Khởi tạo query và Include luôn để tránh Null
            var query = _context.Orders
                .Include(o => o.User)
                .Include(o => o.Course)
                .AsNoTracking()
                .Where(c => !c.IsDeleted);
            if (teacherId > 0)
            {
                query = query.Where(d => d.Course.TeacherId == teacherId);
            }

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
        public async Task<List<OrderModel>> GetAllOrdersForExportAsync(
    string keySearch, DateTime? fromDate, DateTime? toDate, int status, int filterTeacherId)
        {
            // 1. Chỉ Include User (người mua) và Course (khóa học)
            var query = _context.Orders
                .Include(x => x.User)
                .Include(x => x.Course) // 📍 Trỏ thẳng sang bảng Course
                .AsQueryable();

            // 2. Lọc theo từ khóa (Cho tìm theo cả ID Đơn, Email, Tên người mua hoặc Tên khóa học)
            if (!string.IsNullOrEmpty(keySearch))
            {
                keySearch = keySearch.ToLower();
                query = query.Where(x =>
                    x.Id.ToString().Contains(keySearch) ||
                    (x.User.FullName != null && x.User.FullName.ToLower().Contains(keySearch)) ||
                    (x.User.Email != null && x.User.Email.ToLower().Contains(keySearch)) ||
                    (x.Course.Title != null && x.Course.Title.ToLower().Contains(keySearch)) // Tìm theo tên khóa học
                );
            }

            // 3. Lọc theo Khoảng thời gian
            if (fromDate.HasValue)
            {
                query = query.Where(x => x.CreatedAt >= fromDate.Value);
            }
            if (toDate.HasValue)
            {
                // Cộng thêm 1 ngày để bao trọn đến 23:59:59 của ngày kết thúc
                query = query.Where(x => x.CreatedAt < toDate.Value.AddDays(1));
            }

            // 4. Lọc theo Trạng thái (-1 là lấy tất cả)
            if (status != -1)
            {
                query = query.Where(x => (int)x.Status == status);
            }

            // 5. 📍 Lọc theo Giảng viên (Phân quyền bảo mật)
            if (filterTeacherId > 0)
            {
                // Vì 1 Order = 1 Course nên chấm thẳng vào Course.TeacherId luôn
                query = query.Where(x => x.Course.TeacherId == filterTeacherId);
            }

            // 6. Dốc toàn bộ Data ra để xuất Excel (Sắp xếp mới nhất lên đầu)
            return await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        }
    }
}
