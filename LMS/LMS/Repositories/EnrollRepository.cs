
using LMS.Data;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class EnrollRepository : BaseRepository<EnrollmentModel>, IEnrollRepository
    {
        public EnrollRepository(ApplicationDbContext context) : base(context)
        {
        }

        public async Task<bool> IsEnrolledAsync(int userId, int courseId)
        {
            return await _context.Enrollments
        .AnyAsync(e => e.UserId == userId && e.CourseId == courseId);
        }
        public async Task<List<EnrollmentModel>> GetUserEnrollmentsAsync(int userId)
        {
            return await _context.Enrollments
                .AsNoTracking()
                .Where(e => e.UserId == userId && e.IsActive)
                .Include(e => e.Course)
                    .ThenInclude(c => c.Teacher) 
                .Include(e => e.Course)
                    .ThenInclude(c => c.Lessons) 
                .OrderByDescending(e => e.LastAccessedAt)
                .ToListAsync();
        }
        public async Task<bool> UnenrollStudentAsync(int studentId, int courseId, int teacherId)
        {
            // Sử dụng Transaction để đảm bảo nếu trừ tiền lỗi thì toàn bộ quá trình sẽ Rollback
            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    var enrollment = await _context.Enrollments
                        .Include(e => e.Course)
                        .FirstOrDefaultAsync(e => e.UserId == studentId
                                               && e.CourseId == courseId
                                               && e.Course.TeacherId == teacherId);

                    if (enrollment == null) return false;

                    var order = await _context.Orders
                        .FirstOrDefaultAsync(o => o.UserId == studentId
                                               && o.CourseId == courseId
                                               && o.Status == OrderStatusEnum.Success);

                    if (order != null)
                    {
                        var teacher = await _context.Users.FirstOrDefaultAsync(u => u.Id == teacherId);
                        if (teacher != null)
                        {
                            teacher.WalletBalance -= order.Amount;
                            _context.Users.Update(teacher);
                        }

                      
                        order.Status = OrderStatusEnum.Revoked;
                    }

                    _context.Enrollments.Remove(enrollment);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return true;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync(); 
                                                      
                    return false;
                }
            }
        }
        public async Task<List<object>> FilterMyStudentsAsync(int teacherId, List<string> onlineUserIds)
        {
            var onlineUserIdsInt = onlineUserIds
                .Where(id => int.TryParse(id, out _))
                .Select(int.Parse)
                .ToList();

            var myStudents = await _context.Enrollments
                .Where(e => e.Course.TeacherId == teacherId && onlineUserIdsInt.Contains(e.UserId))
                .Select(e => new
                {
                    userId = e.UserId.ToString(),
                    userName = e.User.FullName,
                    avatar = e.User.AvatarUrl
                })
                .Distinct()
                .ToListAsync<object>();

            return myStudents;
        }
     
    
}
}
