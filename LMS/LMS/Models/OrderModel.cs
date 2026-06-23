using LMS.Enums;
using System.ComponentModel.DataAnnotations.Schema;

namespace LMS.Models
{
    public class OrderModel : BaseModel
    {
        public int UserId { get; set; }
        public int CourseId { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; } // Số tiền thanh toán
        public int AppliedRate { get; set; } // % chiết khấu áp dụng lúc mua

        [Column(TypeName = "decimal(18,2)")]
        public decimal AdminAmount { get; set; } // Tiền sàn thu thực tế

        [Column(TypeName = "decimal(18,2)")]
        public decimal TeacherAmount { get; set; }
        public string? OrderDescription { get; set; } // Mô tả đơn hàng

        // Trạng thái đơn hàng: 0-Chờ thanh toán, 1-Thành công, 2-Thất bại
        public OrderStatusEnum Status { get; set; } = 0;

        public string? VnpayTranNo { get; set; } // Mã giao dịch của VNPay trả về
        public string? Vnp_TransactionStatus { get; set; } // Trạng thái chi tiết từ VNPay

        [ForeignKey("UserId")]
        public UserModel User { get; set; }

        [Column("teacherId")]
        public int? TeacherId { get; set; }

        // BỔ SUNG THÊM DÒNG NÀY VÀO DƯỚI TEACHERID BÁC ƠI:
        [ForeignKey("TeacherId")]
        public UserModel? Teacher { get; set; }

        [ForeignKey("CourseId")]
        public CourseModel Course { get; set; }
    }
}
