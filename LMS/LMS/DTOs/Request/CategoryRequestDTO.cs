using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class CategoryRequestDTO
    {
        [Required(ErrorMessage = "Tên danh mục là bắt buộc")]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }
        public bool IsActive { get; set; }
    }
}
