namespace LMS.DTOs.Respone
{
    public class CategoryResponeDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime CreateAt { get; set; }
        public bool IsActive { get; set; }
    }
}
