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
        Task CreateAsync(RoadMapRequestDTO dto, int teacherId);
        Task ChangeStatus(int id);
        Task<RoadMapModel> GetByIdOrThrowAsync(int id);
        Task<RoadMapResponeDTO> GetRoadmapDetail(int id);
        Task<List<RoadMapResponeDTO>> GetAllRoadMaps();
        Task<List<RoadMapResponeDTO>> GetTopRoads();
        Task<RoadMapResponeDTO> RoadMapDetail(int id);
        Task<bool> SaveRoadmapCourses(int roadMapId, List<RoadmapUpdateDTO> items);
        Task<(List<RoadMapResponeDTO> Data, int Total)> GetRoadMapListAsync(
       int page, int pageSize, string keySearch, int isActive);
        Task<bool> ToggleStatusAsync(int id, string role);
        Task RestoreAsync(int id);
        Task HardDeleteAsync(int id);
        Task<(List<RoadMapResponeDTO> Data, int Total)> GetDeletedRoadMapListAsync(
            int page, int pageSize, string keySearch);
        Task<bool> RestoreBulkAsync(List<int> ids);
        Task<bool> HardDeleteBulkAsync(List<int> ids);
        Task<bool> SoftDeleteBulkAsync(List<int> ids);

    }
}
