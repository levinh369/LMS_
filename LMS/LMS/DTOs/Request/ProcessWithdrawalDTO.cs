using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class ProcessWithdrawalDTO
    {
        [Required(ErrorMessage = "Mã giao dịch không được để trống")]
        public int WithdrawalId { get; set; }

        [Required]
        public bool IsApproved { get; set; } // true = Duyệt (Admin đã chuyển khoản), false = Từ chối (Trả lại tiền)

        // Lý do từ chối (Chỉ bắt buộc nhập khi IsApproved = false, logic này đã được check bên Service)
        public string? Note { get; set; }
    }
}
