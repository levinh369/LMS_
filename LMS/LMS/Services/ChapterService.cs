using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;

namespace LMS.Services
{
    public class ChapterService : IChapterService
    {
        private readonly IChapterRepository chapterRepository;
        public ChapterService(IChapterRepository chapterRepository) 
        {
            this.chapterRepository = chapterRepository;
        }

        public async Task<string> ChangeStatusAsync(int chapterId)
        {
            if(chapterId == 0)
            {
                return "ID_INVALID";
            }
            var entity = await chapterRepository.GetByIdAsync(chapterId);
            if(entity == null)
            {
                return "NOT_FOUND";
            }
            entity.IsActive = !entity.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;
            await chapterRepository.UpdateAsync(entity);
            return "SUCCESS";
        }

        public async Task CreateAsync(ChapterRequestDTO dto)
        {
            var exist = await chapterRepository.GetByTitleAsync(dto.Title,dto.CourseId);
            if (exist != null)
            {
                throw new Exception("Chương đã tồn tại!");
            }
            var chapter = new ChapterModel
            {
                Title = dto.Title,
                CourseId = dto.CourseId,
                OrderIndex = dto.OrderIndex,
                CreatedAt = DateTime.UtcNow,
                IsActive = dto.IsActive,
            };
            await chapterRepository.AddAsync(chapter);
        }

        public Task DeleteAsync(int id)
        {
            throw new NotImplementedException();
        }

        public Task<IEnumerable<ChapterResponseDTO>> GetAllAsync()
        {
            throw new NotImplementedException();
        }

        public async Task<List<ChapterResponseDTO>> GetByCourseAsync(int courseId)
        {
            var entities = await chapterRepository.GetByCourseIdAsync(courseId);
            if (entities == null) return new List<ChapterResponseDTO>();
            var result = entities.Select(entity => new ChapterResponseDTO
            {
                Id = entity.Id,
                Title = entity.Title,
                IsActive = entity.IsActive,
                CreateAt = entity.CreatedAt,
                Order = entity.OrderIndex,
            }).ToList();

            return result;
        }

        public async Task<ChapterResponseDTO> GetByIdAsync(int id)
        {

            var entity = await chapterRepository.GetByIdAsync(id);
            if (entity == null)
            {
                return null; 
            }
            var chapter = new ChapterResponseDTO
            {
                Id = entity.Id,
                Title = entity.Title,
                IsActive = entity.IsActive,
                CreateAt = entity.CreatedAt,
                Order = entity.OrderIndex,
            };
            return chapter;
        }

        public Task<ChapterModel> GetByIdOrThrowAsync(int id)
        {
            throw new NotImplementedException();
        }

        public async Task<(List<ChapterResponseDTO> Data, int Total)> GetChaperListAsync(int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive)
        {
            var (entities, total) = await chapterRepository.GetPagedAsync(page, pageSize, keySearch, fromDate, toDate, isActive);
            var modelList = entities.Select(c => new ChapterResponseDTO
            {
                Id = c.Id,
                Title = c.Title,
                Order = c.OrderIndex,
                IsActive = c.IsActive,
                CreateAt = c.CreatedAt,
            }).ToList();
            return (modelList, total);
        }

       

        public async Task<bool> ReorderChaptersAsync(int courseId, List<int> chapterId)
        {
            if(courseId <=0 || chapterId == null || !chapterId.Any())
            {
                return false;
            }
            return await chapterRepository.UpdateChapterOrderAsync(courseId, chapterId);
        }

        public async Task<string> UpdateAsync(int id, ChapterRequestDTO dto)
        {
            if (id <= 0) 
                return "ID_INVALID";
            var entity = await chapterRepository.GetByIdAsync(id);
            if (entity == null) 
                return "NOT_FOUND";
            var exist = await chapterRepository.GetByTitleAsync(dto.Title, dto.CourseId);
            if(exist != null)
            {
                return "DUPLICATE_NAME";
            }
            entity.Title = dto.Title;
            entity.UpdatedAt = DateTime.UtcNow;
            await chapterRepository.UpdateAsync(entity);
            return "SUCCESS"; ;
        }
    }
}
