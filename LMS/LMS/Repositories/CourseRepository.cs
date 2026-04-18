using CloudinaryDotNet;
using LMS.Data;
using LMS.DTOs.Respone;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class CourseRepository : BaseRepository<CourseModel>, ICourseRepository
    {
        public CourseRepository(ApplicationDbContext context) : base(context)
        {
        }
        public async Task<CourseModel?> GetByTitleAsync(string title)
        {
            return await _context.Courses.FirstOrDefaultAsync(c => c.Title == title && !c.IsDeleted);
        }
        public async Task<(List<CourseModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch,
           DateTime? fromDate, DateTime? toDate, int isAcitve)
        {
            var query = _context.Courses.Include(c=>c.Category)
                .Include(c=>c.Chapters)
                .AsNoTracking().Where(c => !c.IsDeleted);
            if (!string.IsNullOrEmpty(keySearch))
                query = query.Where(d => d.Title.Contains(keySearch));
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
        public async Task<CourseModel?> GetById(int id)
        {
            var entity = await _context.Courses
            .Include(c => c.Category) 
            .Include(c => c.CourseDetails)
            .Include(c => c.Chapters)
            .FirstOrDefaultAsync(c => c.Id == id);

            if (entity == null) 
                throw new Exception("Không tìm thấy khóa học");

            return entity;
        }

        public async Task<(List<CourseModel> Data, int Total)> GetPublicCourse(int page, int pageSize, string keySearch)
        {
            var query = _context.Courses.AsNoTracking().Where(c => !c.IsDeleted && c.IsActive);
            if (!string.IsNullOrEmpty(keySearch))
            {
                query = query.Where(d=>d.Title.Contains(keySearch));
            }
            int total = await query.CountAsync();
            var data = await query
                .Include(c => c.Lessons)
                .OrderByDescending(d => d.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (data, total);
        }

        public async Task<CourseModel?> GetCourseAndLessons(int id)
        {
            return await _context.Courses
                .AsNoTracking() 
                .Include(c => c.Lessons.OrderBy(l => l.OrderIndex)) 
                .Where(c => c.Id == id && !c.IsDeleted && c.IsActive) 
                .FirstOrDefaultAsync();
        }

        public async Task<List<CourseModel>> GetCourseFree()
        {
            return await _context.Courses.Include(c=>c.Lessons).Include(c=>c.Category).
                AsNoTracking().Where(c => c.Price == 0 && !c.IsDeleted && c.IsActive).ToListAsync();
        }

        public async Task<List<CourseModel>> GetCoursePremium()
        {
            return await _context.Courses.Include(c=>c.Lessons).Include(c => c.Category).
                AsNoTracking().Where(c=>c.Price > 0 && !c.IsDeleted && c.IsActive).ToListAsync();
        }

        public async Task<CourseModel?> GetCourseDetail(int id)
        {
            return await _context.Courses.AsNoTracking()
            .Include(c => c.Category)               
            .Include(c => c.CourseDetails)            
            .Include(c => c.Enrollments)
            .Include(c => c.Chapters)
                .ThenInclude(ch => ch.Lessons)      
            .FirstOrDefaultAsync(c => c.Id == id);
            
        }

        public async Task<CourseModel?> GetCourseDetailForLearning(int courseId, int? userId)
        {
            var course = await _context.Courses
                .Include(c => c.Chapters.OrderBy(ch => ch.OrderIndex))
                    .ThenInclude(ch => ch.Lessons.OrderBy(l => l.OrderIndex))
                        .ThenInclude(l => l.UserProgress.Where(p => p.UserId == userId && !p.IsDeleted))
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courseId);

            if (course != null)
            {
                var allLessons = course.Chapters.SelectMany(ch => ch.Lessons).ToList();
                int totalLessons = allLessons.Count;
                int completedLessons = allLessons
                    .Count(l => l.UserProgress.Any(p => p.IsCompleted == true));
                double progressPercent = totalLessons > 0
                    ? Math.Round(((double)completedLessons / totalLessons) * 100, 2)
                    : 0;
                course.TotalLessons = totalLessons;
                course.CompletedLessons = completedLessons;
                course.ProgressPercent = progressPercent;
            }

            return course;
        }
        public async Task<List<CourseModel>> GetCourseForUser(int userId)
        {
            var enrollments = await _context.Enrollments
                .AsNoTracking()
                .Where(e => e.UserId == userId && e.IsActive)
                .Include(e => e.Course)
                .OrderByDescending(e => e.LastAccessedAt) 
                .ToListAsync();

            var result = enrollments.Select(e =>
            {
                var course = e.Course;
                if (course != null)
                {
                    // Bốc dữ liệu "ăn sẵn" từ bảng Enrollment sang
                    course.ProgressPercent = e.ProgressPercent;
                    course.IsCompleted = e.IsCompleted;
                    course.LastLearnedDate = e.LastAccessedAt;
                }
                return course;
            })
            .Where(c => c != null)
            .ToList();

            return result;
        }
        public async Task<List<CourseModel>> GetAvailableCoursesAsync(List<int> excludedIds)
        {
            return await _context.Courses.AsNoTracking()
                .Where(c => !excludedIds.Contains(c.Id) && !c.IsDeleted)
                .ToListAsync();
        }
        public async Task<List<CourseSearchDTO>> GetByQueryList(string query, int limit = 8)
        {
            if (string.IsNullOrWhiteSpace(query)) return new List<CourseSearchDTO>();

            var keyword = query.Trim().ToLower();

            return await _context.Courses
                .AsNoTracking() 
                .Where(c => c.Title.ToLower().Contains(keyword)
                            && !c.IsDeleted
                            && c.IsActive)
                .OrderByDescending(c => c.Enrollments.Count())
                .Take(limit)
                .Select(c => new CourseSearchDTO 
                {
                    Id = c.Id,
                    Title = c.Title,
                    ThumbnailUrl = c.ThumbnailUrl,
                    TotalStudents = c.Enrollments.Count()
                })
                .ToListAsync();
        }
    }
}
