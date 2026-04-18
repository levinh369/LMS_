using CloudinaryDotNet;
using CloudinaryDotNet.Core;
using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Services
{
    public class RoadMapService : IRoadMapService
    {
        private IRoadMapRepository roadMapRepository;
        private ICourseRepository courseRepository;
        private ICloudinaryService cloudinaryService;
        public RoadMapService(IRoadMapRepository roadMapRepository, ICloudinaryService cloudinaryService, ICourseRepository courseRepository)
        {
            this.roadMapRepository = roadMapRepository;
            this.cloudinaryService = cloudinaryService;
            this.courseRepository = courseRepository;
        }

        public async Task ChangeStatus(int id)
        {
            var exist = await GetByIdOrThrowAsync(id);
            if(exist.IsDeleted)
            {
                throw new Exception("Lộ trình đã bị xóa trước đó rồi");
            }
            await roadMapRepository.ChangeStatus(exist);
        }

        public async Task CreateAsync(RoadMapRequestDTO dto)
        {
            var exist = await roadMapRepository.GetByTitleAsync(dto.Title);
            if (exist != null)
            {
                throw new Exception("Lộ trình đã tồn tại!");
            }
            string imageUrl = "";
            if (dto.ImageFile != null)
            {
                imageUrl = await cloudinaryService.UploadImageAsync(dto.ImageFile);
            }
            var roadMap = new RoadMapModel
            {
                Title = dto.Title,
                IsActive = dto.IsActive,
                Description = dto.Description,
                ThumbnailUrl = imageUrl,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
            };
            await roadMapRepository.AddAsync(roadMap);
        }

        public async Task DeleteAsync(int id)
        {
            var exist = await GetByIdOrThrowAsync(id);
            if (exist.IsDeleted)
            {
                throw new Exception("Lộ trình đã bị xóa trước đó rồi");
            }
            await roadMapRepository.DeleteAsync(exist);
        }

        public async Task<IEnumerable<RoadMapResponeDTO>> GetAllAsync()
        {
            var roadMaps = await roadMapRepository.GetAllAsync();
            return roadMaps.Select(c => new RoadMapResponeDTO
            {
                Id = c.Id,
                Title = c.Title,
                CreatedAt = c.CreatedAt,
                Description = c.Description,
                ThumbnailUrl = c.ThumbnailUrl,
                IsActive= c.IsActive,
                
            });
        }

        public async Task<List<RoadMapResponeDTO>> GetAllRoadMaps()
        {
            var roadMaps = await roadMapRepository.GetAllRoadMaps();
            return roadMaps.Select(c => new RoadMapResponeDTO
            {
                Id = c.Id,
                Title = c.Title,
                CreatedAt = c.CreatedAt,
                Description = c.Description,
                IsActive = c.IsActive,
                CourseCount = c.RoadmapCourses?.Count() ?? 0,
                ThumbnailUrl = c.RoadmapCourses?
                        .OrderBy(rc => rc.OrderIndex) 
                        .FirstOrDefault()?.Course?.ThumbnailUrl
                        ?? "default-roadmap-thumb.png" 
            }).ToList();
        }

        public async Task<RoadMapResponeDTO> GetByIdAsync(int id)
        {
            var entity = await GetByIdOrThrowAsync(id);

            var roadMap = new RoadMapResponeDTO
            {
                Id = entity.Id,
                Title = entity.Title,
                CreatedAt = entity.CreatedAt,
                IsActive = entity.IsActive,
                Description = entity.Description,
                ThumbnailUrl = entity.ThumbnailUrl,
            };
            return roadMap;
        }

        public async Task<RoadMapModel> GetByIdOrThrowAsync(int id)
        {
            var entity = await roadMapRepository.GetByIdAsync(id);
            if (entity == null)
                throw new Exception("Lộ trình không tồn tại");
            return entity;
        }

        public async Task<RoadMapResponeDTO> GetRoadmapDetail(int id)
        {
            if (id <= 0)
                throw new ArgumentException("ID không hợp lệ");

            var entity = await roadMapRepository.GetRoadmapDetail(id);
            if (entity == null)
                throw new KeyNotFoundException("Không tìm thấy lộ trình bác ơi");
            var rightSideCourses = new List<CourseInRoadMapDTO>();
            var groupedCourses = entity.RoadmapCourses?
                .OrderBy(rc => rc.OrderIndex)
                .GroupBy(rc => rc.PhaseName)
                .ToList();

            if (groupedCourses != null)
            {
                foreach (var group in groupedCourses)
                {
                    rightSideCourses.Add(new CourseInRoadMapDTO
                    {
                        Title = group.Key ?? "Chưa phân loại",
                        IsPhase = true,                       
                        OrderIndex = 0
                    });

                    foreach (var rc in group)
                    {
                        rightSideCourses.Add(new CourseInRoadMapDTO
                        {
                            Id = rc.CourseId,
                            Title = rc.Course?.Title,
                            ThumbnailUrl = rc.Course?.ThumbnailUrl,
                            OrderIndex = rc.OrderIndex,
                            PhaseName = rc.PhaseName,
                            IsPhase = false // Đây là khóa học bình thường
                        });
                    }
                }
            }
            var assignedCourseIds = entity.RoadmapCourses.Select(rc => rc.CourseId).ToList();
            var availableEntities = await courseRepository.GetAvailableCoursesAsync(assignedCourseIds);

            var leftSideCourses = availableEntities.Select(c => new CourseInRoadMapDTO
            {
                Id = c.Id,
                Title = c.Title,
                ThumbnailUrl = c.ThumbnailUrl,
                OrderIndex = 0,
                IsPhase = false // Kho bên trái không cần hiện giai đoạn
            }).ToList();

            // 4. Trả về kết quả tổng hợp
            return new RoadMapResponeDTO
            {
                Id = entity.Id,
                Title = entity.Title,
                CreatedAt = entity.CreatedAt,
                IsActive = entity.IsActive,
                Description = entity.Description,
                ThumbnailUrl = entity.ThumbnailUrl,
                Courses = rightSideCourses,      
                AvailableCourses = leftSideCourses 
            };
        }
        public async Task<(List<RoadMapResponeDTO> Data, int Total)> GetRoadMapListAsync(int page, int pageSize, string keySearch, int isActive)
        {
            var (entities, total) = await roadMapRepository.GetPagedAsync(page, pageSize, keySearch, isActive);
            var modelList = entities.Select(c => new RoadMapResponeDTO
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                IsActive = c.IsActive,
                ThumbnailUrl= c.ThumbnailUrl,
                CreatedAt = c.CreatedAt,
                CourseCount = c.RoadmapCourses?.Count() ??0,
            }).ToList();
            return (modelList, total);
        }

        public async Task<List<RoadMapResponeDTO>> GetTopRoads()
        {
            var entity = await roadMapRepository.GetTopRoadMaps();
            return entity.Select(c => new RoadMapResponeDTO
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                CourseCount = c.RoadmapCourses?.Count() ?? 0,
                ThumbnailUrl = c.RoadmapCourses?
                        .OrderBy(rc => rc.OrderIndex) 
                        .FirstOrDefault()?.Course?.ThumbnailUrl
                        ?? "default-roadmap-thumb.png" 
            }).ToList();
        }

        public async Task<RoadMapResponeDTO> RoadMapDetail(int id)
        {
            var detail = await roadMapRepository.GetRoadmapDetail(id);
            if (detail == null) throw new ArgumentException("Lộ trình không tồn tại!");

            return new RoadMapResponeDTO
            {
                Id = detail.Id,
                Title = detail.Title,
                Description = detail.Description,
                ThumbnailUrl = detail.ThumbnailUrl,
                Courses = detail.RoadmapCourses?
                    .OrderBy(rc => rc.OrderIndex)
                    .Select(rc => new CourseInRoadMapDTO
                    {
                        Id = rc.CourseId,
                        Title = rc.Course.Title,
                        ThumbnailUrl = rc.Course.ThumbnailUrl,
                        OrderIndex = rc.OrderIndex,
                        PhaseName = rc.PhaseName,
                        IsFree = rc.Course.Price
                    }).ToList()
            };
        }

        public async Task<bool> SaveRoadmapCourses(int roadMapId, List<RoadmapUpdateDTO> items)
        {
            if (roadMapId <= 0)
            {
                throw new ArgumentException("ID lộ trình không hợp lệ bác ơi!");
            }
            var result = await roadMapRepository.UpdateRoadmapCoursesAsync(roadMapId, items);
            return result;
        }

        public async Task UpdateAsync(int id, RoadMapRequestDTO dto)
        {
            var roadMap = await GetByIdOrThrowAsync(id);
            if (roadMap.IsDeleted)
                throw new Exception("Lộ trình đã bị xóa trước đó rồi!");
            if (dto.ImageFile != null)
            {
                try
                {
                    roadMap.ThumbnailUrl = await cloudinaryService.UploadImageAsync(dto.ImageFile);
                }
                catch (Exception ex)
                {
                    throw new Exception("Lỗi khi tải ảnh lên Cloudinary: " + ex.Message);
                }
            }
            roadMap.Title = dto.Title;
            roadMap.UpdatedAt = DateTime.UtcNow;
            roadMap.IsActive = dto.IsActive;
            roadMap.Description = dto.Description;
            await roadMapRepository.UpdateAsync(roadMap);
        }
    }
}
