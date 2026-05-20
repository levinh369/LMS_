using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class WithdrawRequestDTO
    {
        [Required(ErrorMessage = "Vui lòng nhập số tiền")]
        [Range(50000, double.MaxValue, ErrorMessage = "Tối thiểu 50,000 VNĐ")]
        public decimal Amount { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn ngân hàng")]
        public string BankName { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập số tài khoản")]
        public string AccountNumber { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập tên chủ tài khoản")]
        public string AccountName { get; set; }
    }
}
