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
                HasPassword = !string.IsNullOrEmpty(u.PasswordHash)
            })
            .FirstOrDefaultAsync();

                return result;
        }

        public async Task<(List<UserModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isAcitve)
        {
            var query = _context.Users.AsNoTracking().Where(c => !c.IsDeleted);
            if (!string.IsNullOrEmpty(keySearch))
                query = query.Where(d => d.FullName.Contains(keySearch));
            if (fromDate.HasValue)
                query = query.Where(d => d.CreatedAt >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(d => d.CreatedAt <= toDate.Value);
            if (isAcitve != -1)
                query = query.Where(d => d.IsActive == (isAcitve == 1));
            int total = await query.CountAsync();
            var data = await query
                .OrderByDescending(d => d.CreatedAt)
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
                    CustomerEmail = o.User.Email
                })
                .ToListAsync();
        }
    }
}
