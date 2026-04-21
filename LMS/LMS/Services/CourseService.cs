using CloudinaryDotNet;
using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LMS.Services
{
    public class CourseService : ICourseService
    {
        private ICourseRepository courseRepository;
        private IEnrollRepository enrollRepository;
        private ILessonRepository lessonRepository;
        private ICloudinaryService cloudinaryService;
        private IlessonService lessonService;
        private IUserProgressRepository userProgressRepository;
        public CourseService(ICourseRepository courseRepository, ICloudinaryService cloudinaryService, IUserProgressRepository userProgressRepository, ILessonRepository lessonRepository, IEnrollRepository enrollRepository, IlessonService lessionService)
        {
            this.courseRepository = courseRepository;
            this.cloudinaryService = cloudinaryService;
            this.userProgressRepository = userProgressRepository;
            this.lessonRepository = lessonRepository;
            this.enrollRepository = enrollRepository;
            this.lessonService = lessionService;
        }
        public async Task CreateAsync(CourseRequestDTO dto, int userId)
        {
            var exist = await courseRepository.GetByTitleAsync(dto.Title);
            if (exist != null)
            {
                throw new Exception("Khóa học đã tồn tại!");
            }
            string imageUrl = "";
            if (dto.ThumbnailFile != null)
            {
                imageUrl = await cloudinaryService.UploadImageAsync(dto.ThumbnailFile);
            }

            var course = new CourseModel
            {
                Title = dto.Title,
                Description = dto.Description,
                Price = dto.Price,
                IsActive = dto.IsActive,
                ThumbnailUrl = imageUrl,
                CategoryId = dto.CategoryId,
                Level = (LevelEnum)dto.Level,
                TeacherId = userId,
                CourseDetails = dto.CourseDetails.Select(d => new CourseDetailModel
                {
                    Content = d.Content,
                    DetailType = (DetailTypeEnum)d.DetailType
                }).ToList()
            };
            try
            {
                await courseRepository.AddAsync(course);
            }
            catch (Exception)
            {
                throw new Exception("Có lỗi xảy ra khi lưu dữ liệu vào hệ thống!");
            }
        }

        public async Task DeleteAsync(int id)
        {
            var exist = await GetByIdOrThrowAsync(id);
            if (exist.IsDeleted)
            {
                throw new Exception("Khóa học đã bị xóa trước đó rồi");
            }
            await courseRepository.DeleteAsync(exist);
        }

        public async Task<IEnumerable<CourseResponeDTO>> GetCourseDetail()
        {
            var courses = await courseRepository.GetAllAsync();
            return courses.Select(c => new CourseResponeDTO
            {
                CourseId = c.Id,
                Title = c.Title,
                Description = c.Description,
                CreateAt = c.CreatedAt,
                ThumbnailUrl = c.ThumbnailUrl,
                Price = c.Price,
            });
        }

        public async Task<CourseResponeDTO> GetByIdAsync(int id)
        {
            var entity = await GetByIdOrThrowAsync(id);

            var course = new CourseResponeDTO
            {
                CourseId = entity.Id,
                Title = entity.Title,
                Description = entity.Description,
                CreateAt = entity.CreatedAt,
                IsActive = entity.IsActive,
                Price = entity.Price,
                ThumbnailUrl = entity.ThumbnailUrl
            };
            return course;

        }
        public async Task<CourseModel> GetByIdOrThrowAsync(int id)
        {
            var entity = await courseRepository.GetByIdAsync(id);
            if (entity == null)
                throw new Exception("Khóa khóa học không tồn tại");
            return entity;
        }
        public async Task<CourseResponeDTO?> GetById(int id)
        {
            var entity = await courseRepository.GetById(id);
            var course = new CourseResponeDTO
            {
                CourseId = entity.Id,
                Title = entity.Title,
                Description = entity.Description,
                CreateAt = entity.CreatedAt,
                IsActive = entity.IsActive,
                Price = entity.Price,
                ThumbnailUrl = entity.ThumbnailUrl,
                CategoryName = entity.Category.Name,
                CategoryId = entity.Category.Id,
                Level = entity.Level,
                totalChapters = entity.Chapters.Count(),
                CourseDetails = (entity.CourseDetails ?? new List<CourseDetailModel>())
                .Select(d => new CourseResponeDetailDTO
                {
                    Content = d.Content,
                    DetailType = (int)d.DetailType
                }).ToList(),
                Chapters = (entity.Chapters ?? new List<ChapterModel>())
                .OrderBy(ch => ch.OrderIndex) 
                .Select(ch => new ChapterResponseDTO
                {
                    Id = ch.Id,
                    Title = ch.Title,
                    Order = ch.OrderIndex,
                }).ToList()

            };
            return course;
        }

        public async Task<(List<CourseResponeDTO> Data, int Total)> GetCourseListAsync(int page, int pageSize, string keySearch, DateTime? fromDate, DateTime? toDate, int isActive)
        {
            var (entities, total) = await courseRepository.GetPagedAsync(page, pageSize, keySearch, fromDate, toDate, isActive);
            var modelList = entities.Select(c => new CourseResponeDTO
            {
                CourseId = c.Id,
                Title = c.Title,
                Description = c.Description,
                IsActive = c.IsActive,
                CreateAt = c.CreatedAt,
                ThumbnailUrl = c.ThumbnailUrl,
                Price = c.Price,
                totalChapters = c.Chapters.Count(),
                CategoryName = c.Category.Name,
                Level = c.Level,
            }).ToList();
            return (modelList, total);
        }

        public async Task UpdateAsync(int id, CourseRequestDTO dto)
        {
            try
            {
                var course = await courseRepository.GetById(id);
                if (course.IsDeleted)
                    throw new Exception("Khóa học đã bị xóa trước đó rồi!");
                if (dto.ThumbnailFile != null)
                {
                    try
                    {
                        course.ThumbnailUrl = await cloudinaryService.UploadImageAsync(dto.ThumbnailFile);
                    }
                    catch (Exception ex)
                    {
                        throw new Exception("Lỗi khi tải ảnh lên Cloudinary: " + ex.Message);
                    }
                }
                course.Title = dto.Title;
                course.Description = dto.Description;
                course.UpdatedAt = DateTime.UtcNow;
                course.IsActive = dto.IsActive;
                course.CategoryId = dto.CategoryId;
                course.Price = dto.Price;
                course.Level = (LevelEnum)dto.Level;
                course.CourseDetails.Clear();
                if (dto.CourseDetails != null && dto.CourseDetails.Any())
                {
                    foreach (var d in dto.CourseDetails)
                    {
                        course.CourseDetails.Add(new CourseDetailModel
                        {
                            Content = d.Content,
                            DetailType = (DetailTypeEnum)d.DetailType,
                            CourseId = course.Id
                        });
                    }
                }
                await courseRepository.UpdateAsync(course);
            }
            catch (Exception ex)
            {
                throw new Exception("Có lỗi xảy ra khi cập nhật khóa học: " + ex.Message);
            }
        }

        public async Task<(List<CourseHomeDTO> Data, int Total)> GetPublicCourse(int page, int pageSize, string keySearch)
        {
            var (courses, total) = await courseRepository.GetPublicCourse(page, pageSize, keySearch);
            var modelList = courses.Select(c => new CourseHomeDTO
            {
                Id = c.Id,
                Title = c.Title,
                Thumbnail = c.ThumbnailUrl,
                Price = c.Price,
                TotalLessons = c.Lessons.Count(),
                IsNew = (DateTime.Now - c.CreatedAt).TotalDays < 30,
                IsBestSeller = true,
                DurationDisplay = FormatDuration(c.Lessons.Sum(l => l.Duration)),
            }).ToList();
            return(modelList,total);
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

        public async Task<CourseDetailDTO> GetCourseDetailAsync(int id)
        {
            var course = await courseRepository.GetCourseAndLessons(id);
            if (course == null) throw new Exception("Khóa học không tồn tại!"); 

            return new CourseDetailDTO
            {
                Id = course.Id,
                Title = course.Title,
                Description = course.Description,
                Thumbnail = course.ThumbnailUrl,
                Price = course.Price,
                OldPrice = course.Price * 1.5m, // Ví dụ: giá cũ cao hơn 50% để làm marketing
                InstructorName = "Nguyễn Văn A",
                TotalLessons = course.Lessons.Count,
                DurationDisplay = FormatDuration(course.Lessons.Sum(l => l.Duration)),
                LastUpdated = course.UpdatedAt,

                // Map danh sách bài học
                Lessons = course.Lessons.Select(l => new LessonPublicDTO
                {
                    Id = l.Id,
                    Title = l.Title,
                    Duration = l.Duration ?? 0,
                    VideoId = l.VideoId,
                    OrderIndex = l.OrderIndex,
                    // Logic: Ví dụ 2 bài đầu tiên có OrderIndex nhỏ nhất sẽ được xem thử
                    IsPreview = l.OrderIndex <= 2
                }).ToList()
            };
        }

        public async Task<List<CourseHomeDTO>> GetCourseFree()
        {
            var courses = await courseRepository.GetCourseFree();
            var modelList = courses.Select(c => new CourseHomeDTO
            {
                Id = c.Id,
                Title = c.Title,
                Price = c.Price,
                Thumbnail = c.ThumbnailUrl,
                TotalLessons = c.Lessons.Count,
                DurationDisplay = FormatDuration(c.Lessons.Sum(l => l.Duration)),
                CategoryName = c.Category.Name,
                InstructorAvatar = c.Teacher?.AvatarUrl ?? "/images/default-avatar.png",
                InstructorName = c.Teacher?.FullName ?? "Giảng viên LMS",
                StudentCount = c.Enrollments?.Count ?? 0,

            }).ToList();
            return modelList;
        }

        public async Task<List<CourseHomeDTO>> GetCoursePremium()
        {
            var courses = await courseRepository.GetCoursePremium();
            var modelList = courses.Select(c => new CourseHomeDTO
            {
                Id = c.Id,
                Title = c.Title,
                Price = c.Price,
                Thumbnail = c.ThumbnailUrl,
                TotalLessons = c.Lessons.Count,
                DurationDisplay = FormatDuration(c.Lessons.Sum(l => l.Duration)),
                CategoryName = c.Category.Name,
                InstructorAvatar = c.Teacher?.AvatarUrl ?? "/images/default-avatar.png",
                InstructorName = c.Teacher?.FullName ?? "Giảng viên LMS",
                StudentCount = c.Enrollments?.Count ?? 0,
            }).ToList();
            return modelList;
        }

        public async Task<CourseResponeDTO> GetCourseDetailHomeAsync(int id, int? userId = null)
        {
            var course = await courseRepository.GetCourseDetail(id);
            if (course == null) return null;
            var response = new CourseResponeDTO
            {
                CourseId = course.Id,
                Title = course.Title,
                Description = course.Description,
                ThumbnailUrl = course.ThumbnailUrl,
                TotalDurationSeconds = course.Chapters.Sum(ch => ch.Lessons.Sum(ls => ls.Duration ?? 0)),
                Price = course.Price,
                CreateAt = course.CreatedAt,
                IsActive = course.IsActive,
                CategoryId = course.CategoryId,
                CategoryName = course.Category?.Name ?? "Chưa phân loại",
                TotalEnrolled = course.Enrollments?.Count ?? 0,
                TotalLessons = course.Chapters.Sum(ch => ch.Lessons.Count),
                totalChapters = course.Chapters.Count(),
                InstructorName = course.Teacher?.FullName ?? " Giảng viên LMS",
                InstructorUrl = course.Teacher?.AvatarUrl ?? "/images/default-avatar.png",
                IsEnrolled = userId.HasValue && course.Enrollments.Any(e => e.UserId == userId.Value && e.IsActive),
                Level = course.Level,

                CourseDetails = course.CourseDetails?.Select(cd => new CourseResponeDetailDTO
                {
                    Content = cd.Content,
                    DetailType = (int)cd.DetailType,
                }).ToList() ?? new List<CourseResponeDetailDTO>(),

                Chapters = course.Chapters?.OrderBy(ch => ch.OrderIndex).Select(ch => new ChapterResponseDTO
                {
                    Id = ch.Id,
                    Title = ch.Title,
                    Order = ch.OrderIndex,
                    IsActive = ch.IsActive,
                    Lessons = ch.Lessons?.OrderBy(l => l.OrderIndex).Select(l => new LessonResponseDTO
                    {
                        Id = l.Id,
                        Title = l.Title,
                        Provider = l.Provider,
                        VideoId = l.VideoId,
                        OrderIndex = l.OrderIndex,
                        Duration = l.Duration,
                        IsPreview = l.IsPreview,
                        IsActive = l.IsActive
                    }).ToList() ?? new List<LessonResponseDTO>()
                }).ToList() ?? new List<ChapterResponseDTO>()
            };

            return response;
        }

        public async Task<CourseResponeDTO?> GetCourseDetailForLearning(int courseId, int? userId = null)
        {
            var course = await courseRepository.GetCourseDetailForLearning(courseId, userId);
            if (course == null) return null;

            var completedLessonIds = await userProgressRepository.GetCompletedLessonIdsAsync(userId);
            bool isPreviousCompleted = true;

            var response = new CourseResponeDTO
            {
                CourseId = course.Id,
                Title = course.Title,
                TotalLessons = course.TotalLessons,
                CompletedLessons = course.CompletedLessons,
                ProgressPercent = course.ProgressPercent,
                Chapters = course.Chapters.OrderBy(c => c.OrderIndex).Select(c => new ChapterResponseDTO
                {
                    Id = c.Id,
                    Title = c.Title,
                    Lessons = c.Lessons.OrderBy(l => l.OrderIndex).Select(l =>
                    {
                        // --- LOGIC XỬ LÝ TRẠNG THÁI ---
                        bool lockedState = !isPreviousCompleted;
                        bool completedState = completedLessonIds.Contains(l.Id);
                        isPreviousCompleted = completedState;

                        // --- LOGIC TẠO URL VIDEO BẢO MẬT ---
                        string finalVideoUrl = "";
                        if (l.Provider == "Bunny")
                        {
                            // Gọi hàm băm mã Token mà mình đã viết ở bước trước
                            finalVideoUrl = lessonService.GenerateSecureBunnyUrl(l.VideoId, l.LibraryId);
                        }
                        else
                        {
                            // Link YouTube đơn giản
                            finalVideoUrl = $"https://www.youtube.com/embed/{l.VideoId}?rel=0";
                        }

                        return new LessonResponseDTO
                        {
                            Id = l.Id,
                            Title = l.Title,
                            // VideoId giữ nguyên để Frontend dùng khi cần
                            VideoId = l.VideoId,
                            Provider = l.Provider,
                            // VideoUrl là link "ăn liền" đã có Token cho Iframe
                            VideoUrl = finalVideoUrl,
                            FormattedDuration = FormatDuration(l.Duration),
                            IsLocked = lockedState,
                            IsCompleted = completedState,
                            WatchedLastTime = l.UserProgress.FirstOrDefault()?.LastWatchedTime ?? 0
                        };
                    }).ToList()
                }).ToList()
            };
            return response;
        }

        public async Task<List<CourseResponeDTO>> GetCoursesForUser(int userId)
        {
            // 1. Gọi Repo lấy data thô (Entity)
            var enrollments = await enrollRepository.GetUserEnrollmentsAsync(userId);

            if (enrollments == null || !enrollments.Any())
                return new List<CourseResponeDTO>();

            // 2. Map sang DTO và xử lý logic hiển thị (GetTimeAgo)
            return enrollments.Select(e => new CourseResponeDTO
            {
                CourseId = e.CourseId,
                Title = e.Course.Title,
                ThumbnailUrl = e.Course.ThumbnailUrl,
                InstructorName = e.Course?.Teacher?.FullName ?? "Hệ thống",
                Progress = e.ProgressPercent, // Lấy % đã lưu sẵn
                LastLearnedFriendly = (e.LastAccessedAt == DateTime.MinValue)
                          ? "Chưa bắt đầu"
                          : GetTimeAgo(e.LastAccessedAt),
                IsCompleted = e.IsCompleted,
                TotalLessons = e.Course.Lessons.Count(),
            }).ToList();
        }
        private string GetTimeAgo(DateTime? dateTime)
        {
            // Nếu null hoặc là ngày mặc định 0001-01-01
            if (dateTime == null || dateTime == DateTime.MinValue || dateTime.Value.Year == 1)
                return "Chưa bắt đầu học";

            var span = DateTime.Now - dateTime.Value;
            if (span.TotalMinutes < 1) return "Vừa xong";
            if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes} phút trước";
            if (span.TotalHours < 24) return $"{(int)span.TotalHours} giờ trước";
            if (span.TotalDays < 2) return "Hôm qua";
            if (span.TotalDays < 30) return $"{(int)span.TotalDays} ngày trước";

            return dateTime.Value.ToString("dd/MM/yyyy");
        }
        public async Task<(int completedCount, int totalCount, bool isFinished )> MarkAsCompleted(int lessonId, int userId)
        {
            return await userProgressRepository.MarkLessonAsCompletedAsync(userId, lessonId);
        }
        public async Task UpdateLastWatchedTime(int userId, int lessonId, int time)
        {
            var lesson = await lessonRepository.GetByIdAsync(lessonId);
            if (lesson != null && lesson.Duration > 0 && (lesson.Duration - time < 20)) time = 0;

            bool isActuallyLearning = (time > 20); // Ngưỡng lọc học dạo
            await userProgressRepository.UpdateLastWatchedTimeAsync(userId, lessonId, time, isActuallyLearning);
        }

        public async Task<List<CourseSearchDTO>> SearchActiveCoursesAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return new List<CourseSearchDTO>();
            }
            var results = await courseRepository.GetByQueryList(query,8);

            return results;
        }

        public async Task<int> GetResumeLessonIdAsync(int userId, int courseId)
        {

            return await userProgressRepository.GetResumeLessonIdAsync(userId, courseId);
        }
    }
}
