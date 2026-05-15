
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
                    .ThenInclude(c => c.Teacher) 
                .Include(e => e.Course)
                    .ThenInclude(c => c.Lessons) 
                .OrderByDescending(e => e.LastAccessedAt)
                .ToListAsync();
        }
        public async Task<bool> UnenrollStudentAsync(int studentId, int courseId, int teacherId)
        {
            var enrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e => e.UserId == studentId
                                       && e.CourseId == courseId
                                       && e.Course.TeacherId == teacherId);

            if (enrollment == null)
            {
                return false;
            }

            _context.Enrollments.Remove(enrollment);
            await _context.SaveChangesAsync();
            return true;
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
