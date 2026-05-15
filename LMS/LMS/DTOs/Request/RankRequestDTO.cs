using System.ComponentModel.DataAnnotations;

namespace LMS.DTOs.Request
{
    public class RankRequestDTO
    {
        [Required(ErrorMessage = "Vui lòng nhập mức doanh thu yêu cầu.")]
        [Range(0, double.MaxValue, ErrorMessage = "Doanh thu yêu cầu không được âm.")]
        public decimal RequiredRevenue { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập tỉ lệ chiết khấu.")]
        [Range(0, 100, ErrorMessage = "Tỉ lệ chiết khấu phải từ 0% đến 100%.")]
        public int DefaultRate { get; set; }
    }
}
