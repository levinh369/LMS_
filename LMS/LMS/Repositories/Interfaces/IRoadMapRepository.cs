using LMS.DTOs.Request;
using LMS.Models;

namespace LMS.Repositories.Interfaces
{
    public interface IRoadMapRepository : IRepository<RoadMapModel>
    {
        Task<RoadMapModel?> GetByTitleAsync(string name);
        Task<(List<RoadMapModel> Data, int Total)> GetPagedAsync(int page, int pageSize, string keySearch,
             int isAcitve);
        Task<List<RoadMapModel>> GetAllRoadMaps();
        Task<RoadMapModel?> GetRoadmapDetail(int id);
        Task<bool> UpdateRoadmapCoursesAsync(int roadmapId, List<RoadmapUpdateDTO> items);
        Task<List<RoadMapModel>> GetTopRoadMaps();
    }
}
