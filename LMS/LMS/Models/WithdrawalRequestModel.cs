using LMS.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class WithdrawalRequestModel : BaseModel
    {
        public int UserId { get; set; } // Người đặt lệnh rút (Teacher)

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; } // Số tiền rút

        [Required, StringLength(100)]
        public string BankName { get; set; } // Tên ngân hàng (VD: Vietcombank, MB Bank)

        [Required, StringLength(50)]
        public string AccountNumber { get; set; } // Số tài khoản ngân hàng

        [Required, StringLength(100)]
        public string AccountName { get; set; } // Tên chủ tài khoản (in hoa không dấu)

        public WithdrawalStatusEnum Status { get; set; } = WithdrawalStatusEnum.Pending;

        [StringLength(255)]
        public string? Note { get; set; } // Ghi chú của Admin (VD: "Sai số tài khoản, vui lòng tạo lại lệnh")

        [ForeignKey("UserId")]
        public UserModel User { get; set; }
    }
}
