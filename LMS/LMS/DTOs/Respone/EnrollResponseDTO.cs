namespace LMS.DTOs.Respone
{
    public class EnrollResponseDTO
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; }
        public DateTime EnrolledAt { get; set; }
        public int CourseId { get; set; }
    }
}
