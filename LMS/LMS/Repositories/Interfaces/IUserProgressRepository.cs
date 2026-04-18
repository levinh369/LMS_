using LMS.Models;
using Microsoft.AspNetCore.Routing.Constraints;

namespace LMS.Repositories.Interfaces
{
    public interface IUserProgressRepository : IRepository<UserProgressModel>
    {
        Task<List<int>> GetCompletedLessonIdsAsync(int? userId);
        Task<(int completedCount, int totalCount, bool isCourseFinished)> MarkLessonAsCompletedAsync(int userId, int lessonId);
        Task UpdateLastWatchedTimeAsync(int userId, int lessonId, int time, bool isActuallyLearning);
        Task<int> GetResumeLessonIdAsync(int userId, int courseId);
    }
}
