using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class ApplyInstructorRequestDTO
    {
        [Required(ErrorMessage = "Vui lòng nhập phần giới thiệu bản thân.")]
        public string Bio { get; set; }
        public string Experience { get; set; }
        [Required(ErrorMessage = "Vui lòng tải lên file CV.")]
        public IFormFile CvFile { get; set; }
    }
    public class RejectApplicationRequestDTO
    {
        [Required(ErrorMessage = "Vui lòng nhập lý do từ chối.")]
        public string Reason { get; set; }
    }
}
