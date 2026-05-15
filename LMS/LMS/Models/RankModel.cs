using LMS.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class RankModel : BaseModel
    {
        [Required, StringLength(50)]
        public string RankName { get; set; } // Đồng, Bạc, Vàng, Kim cương

        public TeacherRankEnum RankEnum { get; set; } // 0, 1, 2, 3

        [Column(TypeName = "decimal(18,2)")]
        public decimal RequiredRevenue { get; set; } // Doanh thu tối thiểu để đạt rank

        public int DefaultRate { get; set; }
    }
}
