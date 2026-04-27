namespace LMS.DTOs.Request
{
    public class EnrollRequestDTO
    {
        public int CourseId { get; set; }
        public int TeacherId {  get; set; }
        public string? StudentName {  get; set; }
    }
}
