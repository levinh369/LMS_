namespace LMS.DTOs.Respone
{
    public class OrderResponeDTO
    {
        public int OrderId { get; set; }
        public string OrderCode { get; set; } // Ví dụ: ORD-10245
        public string CustomerName { get; set; }
        public string CustomerEmail { get; set; }
        public string CourseTitle { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string AvatarUrl {  get; set; }
        public string CourseThumbnail { get; set; }
        public string CourseTitile { get; set; }
        public string InstructorName { get; set; }
        public int courseId {  get; set; }
    }
    public class OrderAdminDetailDTO : OrderResponeDTO
    {
        public string PaymentMethod { get; set; } 
        public string TransactionId { get; set; } 
        public string BankCode { get; set; }   
        public string OrderDescription { get; set; }
        public string TranSactionStatus {  get; set; }
        public string TeacherName { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal AdminAmount { get; set; }
        public decimal TeacherAmount { get; set; }
        public int AppliedRate { get; set; }
    }
}
