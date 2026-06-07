using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using System.Linq.Expressions;

namespace LMS.Services
{
    public class ChapterService : IChapterService
    {
        private readonly IChapterRepository chapterRepository;
        public ChapterService(IChapterRepository chapterRepository) 
        {
            this.chapterRepository = chapterRepository;
        }
        public async Task ChangeStatusAsync(int chapterId, string role, int userId)
        {
            if (chapterId <= 0)
                throw new Exception("ID không hợp lệ!");

            var entity = await chapterRepository.GetByIdAsync(chapterId);
            if (entity == null)
                throw new Exception("Không tìm thấy chương học!");

            bool isAdmin = (role == "Admin" || role == "1");
            bool isTeacher = (role == "Teacher" || role == "3");

            if (isTeacher)
            {
                if (entity.Course != null && entity.Course.TeacherId != userId)
                    throw new Exception("Lỗi phân quyền: Không thể thao tác trên chương của người khác!");

                if (entity.LockedByRole == "Admin" || entity.LockedByRole == "1")
                    throw new Exception("Thao tác bị chặn: Chương này đang bị Admin niêm phong!");
            }
            entity.IsActive = !entity.IsActive;
            entity.UpdatedAt = DateTime.UtcNow.AddHours(7);

            if (isAdmin)
            {
                entity.LockedByRole = !entity.IsActive ? "Admin" : null;
            }

            await chapterRepository.UpdateAsync(entity);
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
                CreatedAt = DateTime.UtcNow.AddHours(7),
                IsActive = true,
            };
            await chapterRepository.AddAsync(chapter);
        }

        public async Task DeleteAsync(int id, string role, int userId)
        {
            var exist = await chapterRepository.GetByIdAsync(id); 

            if (exist == null) throw new Exception("Chương học không tồn tại");
            if (exist.IsDeleted) throw new Exception("Chương học đã bị xóa trước đó rồi");
            if (role == "Teacher")
            {
                if (exist.Course != null && exist.Course.TeacherId != userId)
                    throw new Exception("Lỗi phân quyền: Bạn không có quyền xóa chương của khóa học do người khác tạo!");

                if (exist.LockedByRole == "Admin")
                    throw new Exception("Thao tác bị chặn: Chương này đang bị Admin niêm phong!");
            }

            exist.IsDeleted = true;
            exist.DeletedByRole = role;
            exist.UpdatedAt = DateTime.UtcNow.AddHours(7);
            await chapterRepository.UpdateAsync(exist);
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
                LockedByRole = entity.LockedByRole,
                DeletedByRole = entity.DeletedByRole
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

        public async Task<ChapterModel> GetByIdOrThrowAsync(int id)
        {
            var entity = await chapterRepository.GetByIdAsync(id);
            if (entity == null)
                throw new Exception("Chương không tồn tại");
            return entity;
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
        public async Task<(List<ChapterResponseDTO> Data, int Total)> GetDeletedChapterListAsync(int courseId, int page, int pageSize, string keyword)
        {
            // Đổi tên biến keySearch thành keyword
            Expression<Func<ChapterModel, bool>> filter = x =>
                (courseId == 0 || x.CourseId == courseId) &&
                (string.IsNullOrEmpty(keyword) || x.Title.Contains(keyword));

            var (entities, total) = await chapterRepository.GetDeletedListAsync(
                filter,
                page,
                pageSize
            );

            var dtoList = entities.Select(c => new ChapterResponseDTO
            {
                Id = c.Id,
                Title = c.Title,
                Order = c.OrderIndex,
                IsActive = c.IsActive,
                CreateAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                DeletedByRole = c.DeletedByRole
            }).ToList();

            return (dtoList, total);
        }

        public async Task HardDeleteAsync(int id, string role, int userId)
        {
            var entity = await chapterRepository.GetByIdAsync(id);

            if (entity == null)
                throw new Exception("Chương học không tồn tại.");
            var currentRole = role?.ToLower();
            if (currentRole == "teacher" || currentRole == "3")
            {
                if (entity.Course != null && entity.Course.TeacherId != userId)
                    throw new Exception("Lỗi phân quyền: Bạn không thể xóa vĩnh viễn chương của người khác!");
                var lockedBy = entity.LockedByRole?.ToLower();
                var deletedBy = entity.DeletedByRole?.ToLower();

                if (lockedBy == "admin" || lockedBy == "1" || deletedBy == "admin" || deletedBy == "1")
                    throw new Exception("Thao tác bị chặn: Không thể xóa vĩnh viễn dữ liệu đang bị Admin xử lý!");
            }
            await chapterRepository.HardDeleteAsync(entity);
        }

        public async Task RestoreAsync(int id, string role, int userId)
        {
            var entity = await chapterRepository.GetByIdAsync(id);

            if (entity == null)
                throw new Exception("Chương học không tồn tại hoặc đã bị xóa vĩnh viễn.");
            var currentRole = role?.ToLower();
            if (currentRole == "teacher" || currentRole == "3")
            {
                if (entity.Course != null && entity.Course.TeacherId != userId)
                    throw new Exception("Lỗi phân quyền: Bạn không thể khôi phục chương của người khác!");
                var deletedBy = entity.DeletedByRole?.ToLower();
                if (deletedBy == "admin" || deletedBy == "1")
                    throw new Exception("Thao tác bị chặn: Chương này đã bị Admin xóa do vi phạm, bạn không thể tự khôi phục!");
            }

            entity.IsDeleted = false;
            entity.DeletedByRole = null; 
            entity.UpdatedAt = DateTime.UtcNow.AddHours(7);
          await chapterRepository.UpdateAsync(entity);
        }
    }
}
