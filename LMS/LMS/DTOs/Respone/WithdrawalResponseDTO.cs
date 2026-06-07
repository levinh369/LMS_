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
    public class ServiceResult
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
    }
    namespace YourProject.DTOs
    {
        public class WithdrawalAdminResponseDTO
        {
            public int Id { get; set; }
            public string TeacherName { get; set; } = string.Empty;
            public string TeacherEmail { get; set; } = string.Empty;
            public decimal Amount { get; set; }
            public string BankName { get; set; } = string.Empty;
            public string AccountNumber { get; set; } = string.Empty;
            public string AccountName { get; set; } = string.Empty;
            public int Status { get; set; } // 0: Pending, 1: Approved, 2: Rejected, 3: Disputed
            public DateTime CreatedAt { get; set; }

            // Nhóm ghi chú
            public string? Note { get; set; }
            public string? AdminNote { get; set; }
            public string? DisputeReason { get; set; }
        }
    }
}
