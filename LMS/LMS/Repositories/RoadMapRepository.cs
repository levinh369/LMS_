using LMS.Data;
using LMS.DTOs.Request;
using LMS.Models;
using LMS.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Repositories
{
    public class RoadMapRepository : BaseRepository<RoadMapModel>, IRoadMapRepository
    {
        public RoadMapRepository(ApplicationDbContext context) : base(context)
        {
        }

        public async Task<List<RoadMapModel >> GetAllRoadMaps()
        {
            return await _context.RoadMapModels
                                  .Include(x => x.RoadmapCourses)
                                  .AsNoTracking()
                                  .Where(x => x.IsActive && !x.IsDeleted)
                                  .ToListAsync();
        }

        public async Task<RoadMapModel?> GetByTitleAsync(string name)
        {
            return await _context.RoadMapModels
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Title.ToLower() == name.ToLower() && !r.IsDeleted);
        }

        public async Task<(List<RoadMapModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch, int isAcitve)
        {
            var query = _context.RoadMapModels
                .Include(c=>c.RoadmapCourses)
                .AsNoTracking().Where(c => !c.IsDeleted);
            if (!string.IsNullOrEmpty(keySearch))
                query = query.Where(d => d.Title.Contains(keySearch));
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

        public async Task<RoadMapModel?> GetRoadmapDetail(int id)
        {
            var roadMap = await _context.RoadMapModels
                .Include(r => r.RoadmapCourses)
                    .ThenInclude(rc => rc.Course)
                 .AsNoTracking()  
                .FirstOrDefaultAsync(x => x.Id == id);

            return roadMap;
        }

        public async Task<List<RoadMapModel>> GetTopRoadMaps()
        {
            return await _context.RoadMapModels
                                 .Include(x => x.RoadmapCourses)
                                 .ThenInclude(c=>c.Course)
                                 .AsNoTracking()
                                 .Where(x => x.IsActive && !x.IsDeleted)
                                 .Take(4)
                                 .ToListAsync();
        }

        public async Task<bool> UpdateRoadmapCoursesAsync(int roadmapId, List<RoadmapUpdateDTO> items)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Xóa tất cả các liên kết cũ của lộ trình này
                var existingLinks = _context.RoadmapCourseModels.Where(rc => rc.RoadmapId == roadmapId);
                _context.RoadmapCourseModels.RemoveRange(existingLinks);

                // 2. Chèn danh sách mới kèm theo PhaseName
                if (items != null && items.Any())
                {
                    foreach (var item in items)
                    {
                        var newLink = new RoadmapCourseModel
                        {
                            RoadmapId = roadmapId,
                            CourseId = item.CourseId,
                            OrderIndex = item.OrderIndex, 
                            PhaseName = item.PhaseName,
                            CreatedAt = DateTime.Now
                        };
                        await _context.RoadmapCourseModels.AddAsync(newLink);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return false;
            }
        }
    }
}
