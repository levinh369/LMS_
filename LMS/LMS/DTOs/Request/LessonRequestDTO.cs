using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class LessonRequestDTO
    {
        public int Id { get; set; } // Dùng khi Update

        [Required(ErrorMessage = "Vui lòng chọn khóa học")]
        public int ChapterId { get; set; }

        [Required(ErrorMessage = "Tiêu đề bài học không được để trống")]
        [StringLength(200, ErrorMessage = "Tiêu đề không quá 200 ký tự")]
        public string Title { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn nguồn video (YouTube/Cloudflare)")]
        public string Provider { get; set; }

        [Required(ErrorMessage = "Video ID không được để trống")]
        public string VideoId { get; set; }
        public bool IsPreview {  get; set; }

        public int OrderIndex { get; set; }
        public bool IsActive {  get; set; }
        public string? LibraryId { get; set; }

        public int? Duration { get; set; } 
        public int CourseModelId { get; set; }

    }
}
