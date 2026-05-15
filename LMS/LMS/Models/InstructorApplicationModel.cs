using LMS.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class InstructorApplicationModel:BaseModel
    {
        [Required]
        public int UserId { get; set; }

        [Required(ErrorMessage = "Vui lòng cung cấp phần giới thiệu bản thân")]
        public string Bio { get; set; }

        [Required(ErrorMessage = "Vui lòng cung cấp kinh nghiệm chuyên môn")]
        public string Experience { get; set; }
        [Required(ErrorMessage = "Vui lòng tải lên CV của bạn")]
        public string CvUrl { get; set; }
        public ApplicationStatusEnum Status { get; set; } = ApplicationStatusEnum.Pending;

        // Lưu lý do từ chối (nếu Admin Reject thì điền vào đây để báo lại cho user)
        public string? RejectReason { get; set; }

        [ForeignKey("UserId")]
        public UserModel User { get; set; }
    }
}
