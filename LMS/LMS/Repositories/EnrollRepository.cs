
using LMS.Data;
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
                    .ThenInclude(c => c.Teacher) // Include bảng giáo viên
                .Include(e => e.Course)
                    .ThenInclude(c => c.Lessons) // Include bảng bài học để Count()
                .OrderByDescending(e => e.LastAccessedAt)
                .ToListAsync();
        }
    }
}
