using LMS.Data;
using LMS.DTOs.Respone;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class LessonRepository : BaseRepository<LessonModel>, ILessonRepository
    {
        public LessonRepository(ApplicationDbContext context) : base(context)
        {
        }
        public async Task<LessonModel?> GetByTitleAsync(string title)
        {
            return await _context.Lessons.FirstOrDefaultAsync(c => c.Title == title && !c.IsDeleted);
        }
        public async Task<(List<LessonModel> Data, int Total)> GetLessonAsync(int chapterId ,string keySearch,
           bool? isPreview, int isAcitve)
        {
            var query = _context.Lessons
                .Include(c => c.Chapter)
                .AsNoTracking().Where(c => c.ChapterId == chapterId && !c.IsDeleted);
            if (!string.IsNullOrEmpty(keySearch))
                query = query.Where(d => d.Title.Contains(keySearch));
            if (isPreview.HasValue)
            {
                query = query.Where(d => d.IsPreview == isPreview.Value);
            }
            if (isAcitve != -1)
                query = query.Where(d => d.IsActive == (isAcitve == 1));
            int total = await query.CountAsync();
            var data = await query
            .OrderBy(d => d.OrderIndex)
            .ThenByDescending(d => d.CreatedAt) 
            .ToListAsync();

            return (data, total);
        }
        public async Task<LessonModel?> GetById(int id)
        {
            var entity = await _context.Lessons
            //.Include(c => c.Course)
            .FirstOrDefaultAsync(c => c.Id == id);

            if (entity == null)
                throw new Exception("Không tìm thấy khóa học");

            return entity;
        }
        public async Task AddRangeAsync(List<LessonModel> lessons)
        {
            // Thêm cả danh sách vào bộ nhớ đệm của Entity Framework
            await _context.Lessons.AddRangeAsync(lessons);

            // Lưu xuống Database
            await _context.SaveChangesAsync();
        }
        public async Task<(List<CourseLessonSummaryDTO> Data, int Total)> GetCourseSummariesAsync(int page, int pageSize, string keySearch)
        {
            var query = _context.Courses.
                Where(c=>!c.IsDeleted && c.IsActive).AsQueryable();

            // 1. Tìm kiếm theo tên khóa học
            if (!string.IsNullOrEmpty(keySearch))
            {
                query = query.Where(c => c.Title.Contains(keySearch));
            }

            // 2. Đếm tổng số lượng để phân trang
            var total = await query.CountAsync();

            // 3. Projection: Chỉ lấy những cột cần và tính toán Count/Sum ngay tại SQL
            var data = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new CourseLessonSummaryDTO // Một lớp DTO tạm thời ở tầng Repo
                {
                    Id = c.Id,
                    Name  = c.Title,
                    IsActive = c.IsActive,
                    TotalLessons = c.Lessons.Count(), // SQL sẽ thực hiện COUNT(*)
                    TotalSeconds = c.Lessons.Sum(l => l.Duration) // SQL sẽ thực hiện SUM(Duration)
                })
                .ToListAsync();

            return (data, total);
        }
        public async Task<List<LessonModel>> GetByCourseIdAsync(int courseId)
        {
            // Truy vấn trực tiếp vào bảng Lessons, lọc theo CourseId
            return await _context.Lessons
                //.Where(l => l.CourseId == courseId && !l.IsDeleted)
                .OrderBy(l => l.OrderIndex) // Sắp xếp theo thứ tự bài học
                .ToListAsync();
        }
        public async Task<List<LessonModel>?> GetLessonsByChapterId(int chapterId)
        {
            return await _context.Lessons.AsNoTracking().Where(c => c.ChapterId == chapterId).ToListAsync();
        }

        public async Task<bool> UpdateLessonsOrderAsync(List<int> lessonIds)
        {
            var lessons = await _context.Lessons
                .Where(l => lessonIds.Contains(l.Id))
                .ToListAsync();
            for (int i = 0; i < lessonIds.Count; i++)
            {
                var lesson = lessons.FirstOrDefault(l => l.Id == lessonIds[i]);
                if (lesson != null)
                {
                    lesson.OrderIndex = i + 1; 
                }
            }
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<int> GetMaxOrderIndexByChapterIdAsync(int chapterId)
        {
            var maxOrder = await _context.Lessons
            .AsNoTracking()
            .Where(l => l.ChapterId == chapterId)
            .MaxAsync(l => (int?)l.OrderIndex);

            return maxOrder ?? 0;
        }
        public async Task<int> GetCourseIdByChapterIdAsync(int chapterId)
        {
            return await _context.Chapters
                .AsNoTracking()
                .Where(c => c.Id == chapterId)
                .Select(c => c.CourseId)
                .FirstOrDefaultAsync();
        }
    }
}
