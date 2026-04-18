using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class RoadMapRequestDTO
    {
        public int Id { get; set; } // = 0 là thêm mới, > 0 là sửa

        [Required(ErrorMessage = "Tên lộ trình không được để trống bác ơi!")]
        [StringLength(200)]
        public string Title { get; set; }

        public string? Description { get; set; }

        public IFormFile? ImageFile  { get; set; }
        public string? ThumbnailUrl {  get; set; }

        public bool IsActive { get; set; } = true;
    }
    public class RoadmapUpdateDTO
    {
        public int CourseId { get; set; }
        public int OrderIndex { get; set; }
        public string PhaseName { get; set; }
    }
}
