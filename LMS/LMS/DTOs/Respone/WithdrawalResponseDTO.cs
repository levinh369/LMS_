namespace LMS.DTOs.Respone
{
    public class WithdrawalResponseDTO
    {
        public int Id { get; set; }
        public int TeacherId { get; set; }
        public string TeacherName { get; set; }
        public string TeacherEmail { get; set; }
        public decimal Amount { get; set; }
        public string BankName { get; set; }
        public string AccountNumber { get; set; }
        public string AccountName { get; set; }
        public int Status { get; set; } // 0: Pending, 1: Approved, 2: Rejected
        public string Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
