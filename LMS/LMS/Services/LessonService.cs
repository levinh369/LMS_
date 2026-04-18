using Azure.Core;
using LMS.Configs;
using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
namespace LMS.Services
{
    public class LessonService : IlessonService
    {
        private readonly ILessonRepository lessonRepository;
        private readonly BunnyNetSettings _bunnySettings;
        private readonly IChapterRepository chapterRepository;
        public LessonService(ILessonRepository lessonRepository, IChapterRepository chapterRepository, IOptions<BunnyNetSettings> bunnySettings)
        {
            this.lessonRepository = lessonRepository;
            this.chapterRepository = chapterRepository;
            _bunnySettings = bunnySettings.Value;
        }
        public async Task CreateAsync(LessonRequestDTO dto)
        {
            // 1. Kiểm tra tiêu đề trùng lặp
            var exist = await lessonRepository.GetByTitleAsync(dto.Title);
            if (exist != null)
            {
                throw new Exception("Bài học đã tồn tại!");
            }

            var chapter = await chapterRepository.GetByIdAsync(dto.ChapterId);
            if (chapter == null)
            {
                throw new Exception("Chương (Chapter) không tồn tại!");
            }

            // 3. TẠO MODEL VỚI COURSE ID CHUẨN
            var lesson = new LessonModel
            {
                Title = dto.Title,
                IsActive = dto.IsActive,
                Provider = dto.Provider,
                ChapterId = dto.ChapterId,
                VideoId = dto.VideoId,
                CourseModelId = chapter.CourseId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                IsDeleted = false
            };

            await lessonRepository.AddAsync(lesson);
        }

        public async Task DeleteAsync(int id)
        {
            var exist = await GetByIdOrThrowAsync(id);
            if (exist.IsDeleted)
            {
                throw new Exception("Khóa học đã bị xóa trước đó rồi");
            }
            await lessonRepository.DeleteAsync(exist);
        }

        public async Task<IEnumerable<LessonResponseDTO>> GetAllAsync()
        {
            var courses = await lessonRepository.GetAllAsync();
            return courses.Select(c => new LessonResponseDTO
            {
                Id = c.Id,
                Title = c.Title,
                CreatedAt = c.CreatedAt,
                Provider = c.Provider,
            });
        }

        public async Task<LessonResponseDTO> GetByIdAsync(int id)
        {
            var entity = await GetByIdOrThrowAsync(id);

            var course = new LessonResponseDTO
            {
                Id = entity.Id,
                chapterId = entity.ChapterId,
                Title = entity.Title,
                CreatedAt = entity.CreatedAt,
                IsActive = entity.IsActive,
                VideoId = entity.VideoId,
                Provider = entity.Provider,
                IsPreview = entity.IsPreview,
                FormattedDuration = FormatDuration(entity.Duration),
            };
            return course;

        }
        public async Task<LessonModel> GetByIdOrThrowAsync(int id)
        {
            var entity = await lessonRepository.GetByIdAsync(id);
            if (entity == null)
                throw new Exception("Khóa học không tồn tại");
            return entity;
        }
        public async Task<LessonResponseDTO?> GetById(int id)
        {
            var entity = await lessonRepository.GetById(id);
            var course = new LessonResponseDTO
            {
                Id = entity.Id,
                chapterId = entity.ChapterId,
                Title = entity.Title,
                CreatedAt = entity.CreatedAt,
                IsActive = entity.IsActive,
                VideoId = entity.VideoId,
                Duration = entity.Duration,
            };
            return course;
        }

        public async Task<List<LessonResponseDTO>> GetLessonListAsync(int chapterId)
        {
            if (chapterId <= 0)
            {
                return null;
            }
            var entities = await lessonRepository.GetLessonsByChapterId(chapterId);
            return entities.Select(c => new LessonResponseDTO
            {
                Id = c.Id,
                Title = c.Title,
                VideoId = c.VideoId,
                Provider = c.Provider,
                IsPreview = c.IsPreview,
                OrderIndex = c.OrderIndex,
                CreatedAt = c.CreatedAt,
                IsActive = c.IsActive,
            }).ToList();
        }

        public async Task UpdateAsync(int id, LessonRequestDTO dto)
        {
            var course = await GetByIdOrThrowAsync(id);
            if (course.IsDeleted)
                throw new Exception("Khóa học đã bị xóa trước đó rồi!");

            course.Title = dto.Title;
            course.UpdatedAt = DateTime.UtcNow;
            course.IsActive = dto.IsActive;
            course.VideoId = dto.VideoId;
            course.Duration = dto.Duration;
            course.Provider = dto.Provider;
            course.IsPreview = dto.IsPreview;
            await lessonRepository.UpdateAsync(course);
        }

        public async Task CreateBulkAsync(List<LessonRequestDTO> dtos)
        {
            if (dtos == null || !dtos.Any())
                return;

            var chapterId = dtos.First().ChapterId;
            int currentMax = await lessonRepository.GetMaxOrderIndexByChapterIdAsync(chapterId);
            int nextOrderIndex = currentMax + 1;

            var lessons = dtos.Select(dto =>
            {
                // Tự động phân tích link để lấy Provider và ID
                var (detectedProvider, cleanVideoId) = ParseVideo(dto.VideoId, dto.Provider);

                return new LessonModel
                {
                    Title = dto.Title,
                    ChapterId = dto.ChapterId,
                    VideoId = cleanVideoId,
                    Provider = detectedProvider,

                    // Nếu là Bunny thì lấy LibraryId từ DTO, nếu DTO trống thì lấy từ appsettings
                    LibraryId = (detectedProvider == "Bunny")
                                ? (string.IsNullOrEmpty(dto.LibraryId) ? _bunnySettings.LibraryId : dto.LibraryId)
                                : null,

                    OrderIndex = nextOrderIndex++,
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    IsPreview = dto.IsPreview,
                    Duration = dto.Duration,
                    CourseModelId = dto.CourseModelId
                };
            }).ToList();

            await lessonRepository.AddRangeAsync(lessons);
        }
        private (string Provider, string VideoId) ParseVideo(string input, string? preferredProvider)
        {
            if (string.IsNullOrEmpty(input)) return ("YouTube", "");

            // 1. Kiểm tra nếu là link YouTube
            if (input.Contains("youtube.com") || input.Contains("youtu.be"))
            {
                var id = input.Contains("v=") ? input.Split("v=")[1].Split("&")[0] : input.Split("/").Last();
                return ("YouTube", id);
            }

            // 2. Kiểm tra nếu là link Bunny (dạng embed/LIBRARY_ID/VIDEO_ID)
            if (input.Contains("mediadelivery.net"))
            {
                return ("Bunny", input.TrimEnd('/').Split('/').Last());
            }

            // 3. Nếu không phải link, coi như là ID thuần
            return (preferredProvider ?? "YouTube", input);
        }

        public async Task<(List<LessonResponseDTO> Data, int Total)> GetLessonListAsync(int chapterId, string keySearch, bool? isPreview, int isActive)
        {
            var (entities, total) = await lessonRepository.GetLessonAsync(chapterId, keySearch, isPreview, isActive);
            var modelList = entities.Select(c => new LessonResponseDTO
            {
                Id = c.Id,
                chapterId = c.ChapterId,
                chapterName = c.Chapter.Title,
                Title = c.Title,
                VideoId = c.VideoId,
                Provider = c.Provider,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                IsPreview = c.IsPreview,
                FormattedDuration = FormatDuration(c.Duration),
                OrderIndex = c.OrderIndex,
            }).ToList();
            return (modelList, total);
        }
        public string GenerateSecureBunnyUrl(string videoId, string? libraryId)
        {
            string libId = string.IsNullOrEmpty(libraryId) ? _bunnySettings.LibraryId : libraryId;
            string securityKey = _bunnySettings.SecurityKey;

            // 1. Thiết lập thời gian hết hạn (ví dụ: 2 giờ kể từ bây giờ)
            long expires = DateTimeOffset.UtcNow.AddHours(2).ToUnixTimeSeconds();

            // 2. Tạo mã băm (Token) theo công thức của Bunny: MD5(SecurityKey + VideoID + Expires)
            // Lưu ý: Bunny Stream dùng MD5 cho token đơn giản
            string rawSignature = securityKey + videoId + expires;
            string token = "";

            using (MD5 md5 = MD5.Create())
            {
                byte[] hashBytes = md5.ComputeHash(Encoding.UTF8.GetBytes(rawSignature));
                token = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
            }

            // 3. Trả về link hoàn chỉnh cho Frontend chỉ việc đưa vào src của iframe
            return $"{_bunnySettings.BaseEmbedUrl}/{libId}/{videoId}?token={token}&expires={expires}";
        }

        public async Task<(List<CourseLessonSummaryDTO> Data, int Total)> GetCourseListForAdminAsync(int page, int pageSize, string keySearch)
        {
            // BƯỚC 1: Bóc tách Tuple (data và total) từ Repo
            var (data, total) = await lessonRepository.GetCourseSummariesAsync(page, pageSize, keySearch);
            var modelList = data.Select(d => new CourseLessonSummaryDTO
            {
                Id = d.Id,
                Name = d.Name,
                TotalLessons = d.TotalLessons,
                TotalSeconds = d.TotalSeconds,
                IsActive = d.IsActive,
                CreatedAt = d.CreatedAt,
                // Map thêm các trường hiển thị
                DurationDisplay = FormatDuration(d.TotalSeconds),
                StatusText = d.IsActive ? "Đang hoạt động" : "Tạm khóa",
                StatusClass = d.IsActive ? "bg-success" : "bg-secondary"
            }).ToList();

            // BƯỚC 3: Trả về đúng kiểu Tuple (Danh sách đã map, Tổng số bản ghi)
            return (modelList, total);
        }
        private string FormatDuration(int? seconds)
        {
            if (!seconds.HasValue || seconds.Value <= 0)
            {
                return "00h 00m"; // Hoặc "0 phút" tùy bác
            }
            TimeSpan t = TimeSpan.FromSeconds((double)seconds.Value);
            return string.Format("{0:D2}h {1:D2}m", (int)t.TotalHours, t.Minutes);
        }
        public async Task<List<LessonResponseDTO>> GetLessonsByCourseAsync(int courseId)
        {
            // 1. Lấy dữ liệu thô từ Repository
            var lessons = await lessonRepository.GetByCourseIdAsync(courseId);

            // 2. Map sang ViewModel (để trả về những trường cần thiết cho Frontend)
            return lessons.Select(l => new LessonResponseDTO
            {
                Id = l.Id,
                //CourseId = l.CourseId,

                Title = l.Title,
                VideoId = l.VideoId,
                OrderIndex = l.OrderIndex,
                Duration = l.Duration,
                Provider = l.Provider,
                // Nếu bác muốn format thời lượng ở đây luôn
                FormattedDuration = FormatDuration(l.Duration),
            }).ToList();
        }
        public async Task<bool> ReorderLessonsAsync(List<int> lessonIds)
        {
            if (lessonIds == null || !lessonIds.Any()) return false;
            return await lessonRepository.UpdateLessonsOrderAsync(lessonIds);
        }


        public async Task<int> GetBunnyVideoDurationAsync(string videoId)
        {
            // Thông số cấu hình (Nên đưa vào AppSettings.json)
            string apiKey = _bunnySettings.ApiKey;
            string libraryId = _bunnySettings.LibraryId;
            string url = $"https://video.bunnycdn.com/library/{libraryId}/videos/{videoId}";

            using (var client = new HttpClient())
            {
                // Setup Header
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                client.DefaultRequestHeaders.Add("AccessKey", apiKey);

                try
                {
                    var response = await client.GetAsync(url);

                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsStringAsync();

                        // Deserialize với tùy chọn không phân biệt hoa thường (vì JSON trả về là 'length')
                        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        var videoData = JsonSerializer.Deserialize<BunnyVideoResponse>(content, options);

                        return videoData?.Length ?? 0;
                    }

                    // Xử lý lỗi nếu ID không tồn tại hoặc API Key sai
                    return 0;
                }
                catch (Exception ex)
                {
                    // Log lỗi tại đây
                    return 0;
                }
            }

        }

        public async Task<int> GetCourseId(int chapterId)
        {
            return await lessonRepository.GetCourseIdByChapterIdAsync(chapterId);
        }
    }
}
