namespace LMS.DTOs.Request
{
    public class RegisterRequestDTO
    {
        public string Email {  get; set; }
        public string Password { get; set; }
        public string FullName { get; set; }
        public int? CourseId { get; set; }
    }
}
