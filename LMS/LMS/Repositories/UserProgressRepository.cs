using LMS.Data;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class UserProgressRepository : BaseRepository<UserProgressModel>, IUserProgressRepository
    {
        public UserProgressRepository(ApplicationDbContext context) : base(context)
            {
            }
    public async Task<List<int>> GetCompletedLessonIdsAsync(int? userId)
    {
        return await _context.UsersProgress.Where(u=>u.UserId==userId && u.IsCompleted).Select(up => up.LessonId).ToListAsync();
    }

        public async Task<int> GetResumeLessonIdAsync(int userId, int courseId)
        {
            var allLessonsInCourse = await _context.Lessons
                .Include(l => l.Chapter)
                .Where(l => l.Chapter.CourseId == courseId && !l.IsDeleted)
                // SỬA Ở ĐÂY: Sắp xếp theo "số thứ tự" bác đặt, không dùng ID tự tăng
                .OrderBy(l => l.Chapter.OrderIndex) // Thằng nào OrderIndex = 1 (Cài đặt) sẽ lên đầu
                .ThenBy(l => l.OrderIndex)          // Sắp xếp bài học trong chương đó
                .Select(l => l.Id)
                .ToListAsync();

            var completedLessonIds = await _context.UsersProgress
                .Where(p => p.UserId == userId && p.CourseId == courseId && p.IsCompleted && !p.IsDeleted)
                .Select(p => p.LessonId)
                .ToListAsync();

            var resumeId = allLessonsInCourse.FirstOrDefault(id => !completedLessonIds.Contains(id));

            return resumeId != 0 ? resumeId : allLessonsInCourse.LastOrDefault();
        }
        public async Task<(int completedCount, int totalCount, bool isCourseFinished)> MarkLessonAsCompletedAsync(int userId, int lessonId)
        {
            var lesson = await _context.Lessons.AsNoTracking().FirstOrDefaultAsync(l => l.Id == lessonId);
            int courseId = lesson.CourseModelId ?? 0;

            var progress = await _context.UsersProgress.FirstOrDefaultAsync(up => up.UserId == userId && up.LessonId == lessonId);
            if (progress == null)
            {
                progress = new UserProgressModel { UserId = userId, LessonId = lessonId, CourseId = courseId, IsCompleted = true, UpdatedAt = DateTime.Now };
                await _context.UsersProgress.AddAsync(progress);
            }
            else
            {
                progress.IsCompleted = true;
                progress.UpdatedAt = DateTime.Now;
            }

            // --- BƯỚC QUAN TRỌNG: LƯU TRƯỚC KHI ĐẾM ---
            await _context.SaveChangesAsync();

            // Bây giờ mới đếm thì con số mới chính xác 100%
            int totalLessons = await _context.Lessons.CountAsync(l => l.CourseModelId == courseId && !l.IsDeleted);
            int completedLessons = await _context.UsersProgress.CountAsync(up => up.UserId == userId && up.CourseId == courseId && up.IsCompleted);
            double percent = totalLessons > 0 ? Math.Round(((double)completedLessons / totalLessons) * 100, 2) : 0;

            bool isCourseFinished = false;
            var enrollment = await _context.Enrollments.FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == courseId);
            if (enrollment != null)
            {
                enrollment.ProgressPercent = percent;
                if (completedLessons == totalLessons)
                {
                    if (!enrollment.IsCompleted) 
                    {
                        enrollment.IsCompleted = true;
                        enrollment.CompletedAt = DateTime.Now;
                    }
                    isCourseFinished = true; 
                }
                _context.Enrollments.Update(enrollment);
                await _context.SaveChangesAsync(); // Lưu lần 2 cho bảng Enrollment
            }

            return (completedLessons, totalLessons, isCourseFinished);
        }
        public async Task UpdateLastWatchedTimeAsync(int userId, int lessonId, int time, bool isActuallyLearning)
        {
            var progress = await _context.UsersProgress.FirstOrDefaultAsync(u => u.UserId == userId && u.LessonId == lessonId);

            if (progress == null)
            {
                var lesson = await _context.Lessons.AsNoTracking().FirstOrDefaultAsync(l => l.Id == lessonId);
                progress = new UserProgressModel
                {
                    UserId = userId,
                    LessonId = lessonId,
                    CourseId = lesson.CourseModelId ?? 0,
                    LastWatchedTime = time,
                    UpdatedAt = DateTime.Now
                };
                await _context.UsersProgress.AddAsync(progress);
            }
            else
            {
                progress.LastWatchedTime = time;
                if (isActuallyLearning) progress.UpdatedAt = DateTime.Now;
            }

            if (isActuallyLearning)
            {
                var enrollment = await _context.Enrollments.FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == progress.CourseId);
                if (enrollment != null)
                {
                    enrollment.LastAccessedAt = DateTime.Now;
                }
            }
            await _context.SaveChangesAsync();
        }
    }
}
