namespace LMS.DTOs.Respone
{
    public class WithdrawalHistoryDTO
    {
        public int Id { get; set; }
        public decimal Amount { get; set; }
        public string BankName { get; set; }
        public string AccountNumber { get; set; }
        public DateTime CreatedAt { get; set; }
        public int Status { get; set; } // 0: Chờ duyệt, 1: Thành công, 2: Từ chối
        public string Note { get; set; }
        public string AdminNote { get; set; }
    }
    public class TeacherWalletStatsDTO
    {
        public decimal AvailableBalance { get; set; } // Số dư khả dụng
        public decimal PendingAmount { get; set; }    // Đang chờ duyệt
        public int PendingCount { get; set; }         // Số lượng đơn đang chờ
        public decimal TotalWithdrawn { get; set; }   // Đã rút thành công
    }
}
