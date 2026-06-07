namespace LMS.DTOs.Respone
{
    public class WithdrawalDetailResponseDTO
    {
        public int Id { get; set; } // Map thành #WD{Id} trên giao diện
        public decimal Amount { get; set; } // Số tiền rút (dùng decimal để tránh sai số tài chính)
        public int Status { get; set; } // 0: Đang xử lý, 1: Hoàn tất, 2: Thất bại, 3: Đang khiếu nại
        public DateTime CreatedAt { get; set; } // Thời gian tạo lệnh rút
        public string BankName { get; set; } = string.Empty; // Tên ngân hàng (VD: Vietcombank, MBBank)
        public string AccountNumber { get; set; } = string.Empty; // Số tài khoản (Hiện full ở chi tiết, ẩn 4 số cuối ở bảng)
        public string AccountName { get; set; } = string.Empty; // Tên chủ tài khoản (VD: NGUYEN VAN A)

        // 3. Cụm trường thông tin/lịch sử trao đổi (Cho phép Null vì không phải lúc nào cũng có)
        public string? Note { get; set; } // Ghi chú của Admin điền lúc Duyệt hoặc Từ chối giao dịch ban đầu
        public string? DisputeReason { get; set; } // Lý do Giảng viên viết khi bấm nút "Báo lỗi"
        public string? AdminNote { get; set; }
        public string? TeacherName {  get; set; }
        public string TeacherEmail { get; set; }
    }
}
