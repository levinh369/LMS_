using LMS.Data;
using LMS.DTOs.Respone;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class UserRepository : BaseRepository<UserModel>, IUserRepository
    {
        public UserRepository(ApplicationDbContext context) : base(context)
        {
        }

        public async Task<UserModel?> GetByEmailAsync(string email)
        {
            return await _context.Users
                .Include(u => u.Role) 
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
        }

        public async Task<bool> ExistsByEmailAsync(string email)
        {
            return await _context.Users.AnyAsync(u => u.Email.ToLower() == email.ToLower());
        }

        public async Task<MyProfileResponseDTO> GetFullProfileDataAsync(int userId)
        {
            var user = await _context.Users
                .Where(u => u.Id == userId)
                .Select(u => new MyProfileResponseDTO
                {
                    UserId = u.Id,
                    FullName = u.FullName,
                    Avatar = u.AvatarUrl,
                    JoinDate = u.CreatedAt.ToString("'Tháng' MM/yyyy"),

                    // Lấy toàn bộ danh sách Enrollment và map sang DTO
                    OngoingCourses = u.Enrollments
                        .Where(e => !e.IsCompleted)
                        .Select(e => new CourseItemProfileDto
                        {
                            CourseId = e.CourseId,
                            Title = e.Course.Title,
                            Thumbnail = e.Course.ThumbnailUrl,
                            Progress = e.ProgressPercent,
                            LastLearned = e.LastAccessedAt
                        }).ToList(),

                    CompletedCourses = u.Enrollments
                        .Where(e => e.IsCompleted)
                        .Select(e => new CourseItemProfileDto
                        {
                            CourseId = e.CourseId,
                            Title = e.Course.Title,
                            Thumbnail = e.Course.ThumbnailUrl,
                            Progress = 100,
                            LastLearned = e.LastAccessedAt
                        }).ToList()
                })
                .FirstOrDefaultAsync();

            if (user != null)
            {
                user.OngoingCount = user.OngoingCourses.Count;
                user.CompletedCount = user.CompletedCourses.Count;
            }

            return user;
        }

        public async Task<UserSettingsResponseDTO> GetUserSettingsAsync(int userId)
        {
            var result = await _context.Users
            .Where(u => u.Id == userId)
            .Select(u => new UserSettingsResponseDTO
            {
                FullName = u.FullName,
                Email = u.Email,
                Avatar = u.AvatarUrl,
                HasPassword = !string.IsNullOrEmpty(u.PasswordHash),
                RoleId = u.RoleId
            })
            .FirstOrDefaultAsync();

                return result;
        }

        public async Task<(List<UserModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive, int teacherId, int roleId, int courseId)
        {
            // Bỏ Include ở đây, ta sẽ cấu hình Include linh hoạt ở bên dưới
            var query = _context.Users
                .AsNoTracking()
                .Where(u => !u.IsDeleted && u.RoleId != 1);

            if (teacherId > 0)
            {
                // 1. Lọc ra những học viên có đăng ký khóa của Giảng viên này
                query = query.Where(u => u.Enrollments
                    .Any(e => e.Course.TeacherId == teacherId && (courseId <= 0 || e.CourseId == courseId)));

                // 2. FILTERED INCLUDE: Chỉ lấy các đăng ký khóa học (Enrollments) thuộc về đúng Giảng viên này
                query = query.Include(u => u.Enrollments
                                .Where(e => e.Course.TeacherId == teacherId && (courseId <= 0 || e.CourseId == courseId)))
                             .ThenInclude(e => e.Course);
            }
            else
            {
                // Nếu là Admin (teacherId == 0) -> Lấy toàn bộ Enrollments bình thường
                query = query.Include(u => u.Enrollments)
                             .ThenInclude(e => e.Course);

                if (roleId != -1)
                {
                    query = query.Where(u => u.RoleId == roleId);
                }
            }

            if (!string.IsNullOrEmpty(keySearch))
            {
                string search = keySearch.ToLower();
                query = query.Where(u => u.FullName.ToLower().Contains(search) || u.Email.ToLower().Contains(search));
            }

            if (fromDate.HasValue)
                query = query.Where(u => u.CreatedAt >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(u => u.CreatedAt <= toDate.Value.AddDays(1).AddTicks(-1));

            if (isActive != -1)
                query = query.Where(u => u.IsActive == (isActive == 1));

            int total = await query.CountAsync();

            var data = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
        }
        public async Task<UserModel?> GetByExternalIdAsync(string externalId, string provider)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.ExternalId == externalId
                                       && u.Provider == provider
                                       && !u.IsDeleted); 
        }

        public async Task<List<OrderResponeDTO>> GetOrdersList(int userId)
        {
            return await _context.Orders
                .AsNoTracking()
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedAt) // Đơn mới nhất lên đầu
                .Select(o => new OrderResponeDTO
                {
                    OrderId = o.Id,
                    OrderCode = "ORD-"+o.Id, // Ví dụ: ORD-10245
                    CourseTitle = o.Course.Title,
                    AvatarUrl = o.Course.ThumbnailUrl, // Lấy ảnh khóa học để hiển thị trong danh sách
                    courseId = o.Course.Id,
                    TotalAmount = o.Amount,
                    Status = o.Status.ToString(), // Trả về "Success", "Pending", "Canceled"
                    CreatedAt = o.CreatedAt,
                    // Nếu DTO của bác có thêm các trường này thì gán vào luôn
                    CustomerName = o.User.FullName,
                    CustomerEmail = o.User.Email,
                    InstructorName = o.Course.Teacher != null ? o.Course.Teacher.FullName : "Chưa cập nhật"
                })
                .ToListAsync();
        }
    }
}
