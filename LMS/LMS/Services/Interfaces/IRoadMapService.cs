using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;

namespace LMS.Services.Interfaces
{
    public interface IRoadMapService
    {
        Task<IEnumerable<RoadMapResponeDTO>> GetAllAsync();
        Task<RoadMapResponeDTO> GetByIdAsync(int id);
        Task UpdateAsync(int id, RoadMapRequestDTO dto);
        Task DeleteAsync(int id);
        Task CreateAsync(RoadMapRequestDTO dto);
        Task ChangeStatus(int id);
        Task<RoadMapModel> GetByIdOrThrowAsync(int id);
        Task<RoadMapResponeDTO> GetRoadmapDetail(int id);
        Task<List<RoadMapResponeDTO>> GetAllRoadMaps();
        Task<List<RoadMapResponeDTO>> GetTopRoads();
        Task<RoadMapResponeDTO> RoadMapDetail(int id);
        Task<bool> SaveRoadmapCourses(int roadMapId, List<RoadmapUpdateDTO> items);
        Task<(List<RoadMapResponeDTO> Data, int Total)> GetRoadMapListAsync(
       int page, int pageSize, string keySearch, int isActive);
    }
}
