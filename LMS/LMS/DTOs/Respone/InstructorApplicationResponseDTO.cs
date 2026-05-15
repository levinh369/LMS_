namespace LMS.DTOs.Respone
{
    public class InstructorApplicationResponseDTO
    {
        public int Id { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Bio { get; set; }
        public string Experience { get; set; }
        public string CvUrl { get; set; }
        public string Status { get; set; }
        public DateTime AppliedAt { get; set; }
    }
}
