using CloudinaryDotNet;
using LMS.Data;
using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;
using LMS.Repositories.Interfaces;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class CourseRepository : BaseRepository<CourseModel>, ICourseRepository
    {
        private readonly ICloudinaryService _cloudinaryService;
        public CourseRepository(ApplicationDbContext context, ICloudinaryService cloudinaryService) : base(context)
        {
            _cloudinaryService = cloudinaryService;
        }
        public async Task<CourseModel?> GetByTitleAsync(string title)
        {
            return await _context.Courses.FirstOrDefaultAsync(c => c.Title == title && !c.IsDeleted);
        }
        public async Task<(List<CourseModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch,
    DateTime? fromDate, DateTime? toDate, int isAcitve, int teacherId, int categoryId)
        {
            var query = _context.Courses
                .Include(c => c.Category)
                .Include(c => c.Teacher)
                .Include(c => c.Chapters)
                .AsNoTracking()
                .Where(c => !c.IsDeleted);
            if (teacherId > 0)
            {
                query = query.Where(c => c.TeacherId == teacherId);
            }
            if (categoryId > 0)
            {
                query = query.Where(c => c.CategoryId == categoryId);
            }
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
                query = query.Where(d => d.Title.Contains(keySearch));
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
            return await _context.Courses.Include(c => c.Lessons).Include(c => c.Category).Include(e => e.Enrollments).Include(c => c.Teacher).
                AsNoTracking().Where(c => c.Price == 0 && !c.IsDeleted && c.IsActive).ToListAsync();
        }

        public async Task<List<CourseModel>> GetCoursePremium()
        {
            return await _context.Courses.Include(c => c.Lessons).Include(c => c.Category).Include(e => e.Enrollments).Include(c => c.Teacher).
                AsNoTracking().Where(c => c.Price > 0 && !c.IsDeleted && c.IsActive).ToListAsync();
        }

        public async Task<CourseModel?> GetCourseDetail(int id)
        {
            return await _context.Courses.AsNoTracking()
                .Include(c => c.Category)
                .Include(c => c.CourseDetails)
                .Include(c => c.Enrollments)
                .Include(c => c.Teacher)
                .Include(c => c.Chapters)
                    .ThenInclude(ch => ch.Lessons.Where(l => l.IsActive == true && l.IsDeleted == false))
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<CourseModel?> GetCourseDetailForLearning(int courseId, int? userId)
        {
            var course = await _context.Courses
                .Include(c => c.Chapters
                    .Where(ch => ch.IsActive && !ch.IsDeleted)
                    .OrderBy(ch => ch.OrderIndex))
                    .ThenInclude(ch => ch.Lessons
                        .Where(l => l.IsActive && !l.IsDeleted)
                        .OrderBy(l => l.OrderIndex))
                        .ThenInclude(l => l.UserProgress
                            .Where(p => p.UserId == userId && !p.IsDeleted))
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
        public async Task<List<UserModel>> GetAllTeachersAsync()
        {
            return await _context.Users
                .AsNoTracking()
                .Where(u => u.RoleId == 3 && !u.IsDeleted)
                .OrderBy(u => u.FullName)
                .ToListAsync();
        }
        public async Task<bool> ToggleStatusAsync(int id, string role)
        {
            var course = await _context.Courses.FindAsync(id);
            if (course == null) return false;

            if (role == "Admin")
            {
                if (course.IsActive)
                {
                    course.IsActive = false;
                    course.LockedByRole = "Admin";
                }
                else
                {
                    course.IsActive = true;
                    course.LockedByRole = null;
                }
            }
            else if (role == "Teacher")
            {
                if (course.LockedByRole == "Admin")
                {
                    return false;
                }

                course.IsActive = !course.IsActive;
                course.LockedByRole = null;
            }

            course.UpdatedAt = DateTime.UtcNow.AddHours(7);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<CourseLookupDTO>> GetCourseByTeacherAsync(int id)
        {
            return await _context.Courses
                .AsNoTracking()
                .Where(c => c.TeacherId == id && !c.IsDeleted)
                .Select(c => new CourseLookupDTO
                {
                    Id = c.Id,
                    Title = c.Title
                })
                .ToListAsync();
        }
        public async Task<CourseModel?> GetByLessonId(int lessonId)
        {
            var courseId = await _context.Lessons
                .Where(l => l.Id == lessonId)
                .Select(l => l.CourseModelId)
                .FirstOrDefaultAsync();

            if (courseId <= 0) return null;

            return await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == courseId);
        }
        public virtual async Task<int> UpdateDeleteStatusBulkAsync(List<int> ids, bool isDeleted, string role, int userId)
        {
            // Nhớ dùng _context.Courses (hoặc _dbSet nếu base đã định nghĩa)
            var query = _context.Courses.IgnoreQueryFilters().Where(x => ids.Contains(x.Id));

            if (role == "Teacher")
            {
                query = query.Where(x => x.TeacherId == userId && x.LockedByRole != "Admin");
            }

            var entities = await query.ToListAsync();

            if (!entities.Any()) return 0;

            foreach (var entity in entities)
            {
                entity.IsDeleted = isDeleted;
                entity.DeletedByRole = isDeleted ? role : null;
                entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
            }

            _context.Courses.UpdateRange(entities);
            await _context.SaveChangesAsync();

            return entities.Count;
        }
        public async Task<int> HardDeleteBulkAsync(List<int> ids, string role, int userId)
        {
            var query = _context.Courses.IgnoreQueryFilters().Where(x => ids.Contains(x.Id));

            if (role == "Teacher")
            {
                query = query.Where(x => x.TeacherId == userId
                                       && x.DeletedByRole != "Admin"
                                       && x.LockedByRole != "Admin");
            }

            // 1. Lôi danh sách các khóa học đủ điều kiện xóa lên
            var entities = await query.ToListAsync();

            if (!entities.Any()) return 0;

            var imageUrls = entities
                .Where(x => !string.IsNullOrEmpty(x.ThumbnailUrl))
                .Select(x => x.ThumbnailUrl)
                .ToList();

            if (imageUrls.Any())
            {
                // Tạo danh sách các tác vụ xóa ảnh và cho chạy song song (Task.WhenAll)
                var deleteTasks = imageUrls.Select(url => _cloudinaryService.DeleteImageFromUrlAsync(url));
                await Task.WhenAll(deleteTasks);
            }
            _context.Courses.RemoveRange(entities);
            await _context.SaveChangesAsync();

            return entities.Count;
        }
        public async Task<(List<CourseSearchResultItemDto> Data, int Total)> GetPublicCoursesAsync(CourseSearchRequestDTO filter)
        {
            // Bắt đầu với IQueryable
            var query = _context.Courses
                .AsNoTracking()
                .Where(c => !c.IsDeleted && c.IsActive);

            // Lọc theo từ khóa
            if (!string.IsNullOrWhiteSpace(filter.Keyword))
            {
                query = query.Where(c => c.Title.Contains(filter.Keyword));
            }

            // Lọc theo trình độ
            if (filter.Levels?.Any() == true)
            {
                query = query.Where(c => filter.Levels.Contains((int)c.Level));
            }

            // Lọc theo Free/Premium
            if (filter.IsFree.HasValue)
            {
                query = filter.IsFree.Value ? query.Where(c => c.Price <= 0) : query.Where(c => c.Price > 0);
            }

            // Đếm tổng bản ghi (Phải đếm trước khi Skip/Take)
            int total = await query.CountAsync();

            // Sắp xếp
            query = filter.SortBy?.ToLower() switch
            {
                "price_asc" => query.OrderBy(c => c.Price),
                "price_desc" => query.OrderByDescending(c => c.Price),
                _ => query.OrderByDescending(c => c.CreatedAt)
            };

            // Projection: Lấy đúng dữ liệu cần, không dùng Include nặng nề
            var data = await query
                .Skip((filter.PageIndex - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(c => new CourseSearchResultItemDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    ThumbnailUrl = c.ThumbnailUrl ?? "/img/default-course.png",
                    Price = c.Price,
                    IsFree = c.Price <= 0,
                    Level = (int)c.Level,
                    InstructorName = c.Teacher != null ? c.Teacher.FullName : "Giảng viên LMS",
                    // Đếm số bài học và học viên trực tiếp tại DB
                    LessonCount = c.Lessons.Count(l => !l.IsDeleted && l.IsActive),
                    StudentCount = c.Enrollments.Count(e => !e.IsDeleted && e.IsActive),
                    // Lưu giây vào 1 biến tạm để format ở tầng Service
                    DurationRaw  = c.Lessons.Where(l => !l.IsDeleted && l.IsActive).Sum(l => l.Duration ?? 0)
                })
                .ToListAsync();

            return (data, total);
        }

        public async Task<bool> CheckUserEnrollmentAsync(int courseId, int userId)
        {

            return await _context.Enrollments
                .AnyAsync(e => e.CourseId == courseId
                            && e.UserId == userId
                            && e.IsDeleted == false);
        }

    }
    }
