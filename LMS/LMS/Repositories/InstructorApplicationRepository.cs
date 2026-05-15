using LMS.Data;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class InstructorApplicationRepository : BaseRepository<InstructorApplicationModel>, IInstructorApplicationRepository
    {
        public InstructorApplicationRepository(ApplicationDbContext context) : base(context)
        {
        }
        public async Task<bool> HasPendingApplicationAsync(int userId)
        {
            return await _context.InstructorApplications
                .AnyAsync(x => x.UserId == userId && x.Status == ApplicationStatusEnum.Pending);
        }

        public async Task<IEnumerable<InstructorApplicationModel>> GetPendingApplicationsAsync()
        {
            return await _context.InstructorApplications
                .Include(x => x.User) // Join để lấy thêm Tên/Email hiển thị lên bảng Admin
                .Where(x => x.Status == ApplicationStatusEnum.Pending)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public async Task<InstructorApplicationModel> GetApplicationWithUserAsync(int applicationId)
        {
            return await _context.InstructorApplications
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.Id == applicationId);
        }

        public async Task<bool> ApproveApplicationAsync(int applicationId, int instructorRoleId)
        {
            // Bắt đầu Transaction
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Tìm đơn đăng ký
                var application = await _context.InstructorApplications.FindAsync(applicationId);
                if (application == null || application.Status != ApplicationStatusEnum.Pending)
                    return false;

                // 2. Tìm User nộp đơn
                var user = await _context.Users.FindAsync(application.UserId);
                if (user == null)
                    return false;

                // 3. Cập nhật trạng thái đơn thành Approved
                application.Status = ApplicationStatusEnum.Approved;

                // 4. Cập nhật Role của User thành Giảng viên
                user.RoleId = instructorRoleId;

                // 5. Lưu cả 2 thay đổi vào DB
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> RejectApplicationAsync(int applicationId, string rejectReason)
        {
            var application = await _context.InstructorApplications.FindAsync(applicationId);
            if (application == null || application.Status != ApplicationStatusEnum.Pending)
                return false;

            application.Status = ApplicationStatusEnum.Rejected;
            application.RejectReason = rejectReason;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<(List<InstructorApplicationModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch, string status, string sort)
        {
            var query = _context.InstructorApplications
                                .Include(c => c.User)
                                .AsNoTracking()
                                .AsQueryable();

            if (!string.IsNullOrEmpty(keySearch))
            {
                keySearch = keySearch.ToLower();
                query = query.Where(d =>
                    (d.User.FullName.ToLower().Contains(keySearch)) ||
                    (d.User.Email.ToLower().Contains(keySearch)) ||
                    (d.Bio.ToLower().Contains(keySearch))
                );
            }

            if (!string.IsNullOrEmpty(status) && status != "All")
            {
               
                if (Enum.TryParse<ApplicationStatusEnum>(status, out var parsedStatus))
                {
                    query = query.Where(d => d.Status == parsedStatus);
                }
            }
            int total = await query.CountAsync();

            if (sort == "oldest")
            {
                query = query.OrderBy(d => d.CreatedAt);
            }
            else
            {
                query = query.OrderByDescending(d => d.CreatedAt);
            }

            var data = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
        }
        // Thêm hàm này vào Repo của bạn
        public async Task<InstructorApplicationModel> GetApplicationWithUserByIdAsync(int id)
        {
            return await _context.InstructorApplications
                                 .Include(x => x.User) 
                                 .FirstOrDefaultAsync(x => x.Id == id);
        }
    }
}

