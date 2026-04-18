namespace LMS.DTOs.Respone
{
    public class LessonResponseDTO
    {
        public int Id { get; set; }
        public int CourseId { get; set; }
        public int chapterId { get; set; }
        public string chapterName { get; set; }
        public string Title { get; set; }
        public string Provider { get; set; }
        public string VideoId { get; set; }

        // Thuộc tính tự động tính toán URL dựa trên Provider
        public string VideoUrl { get;set; }

        public int OrderIndex { get; set; }
        public int? Duration { get; set; }

        // Có thể thêm trường định dạng thời gian (ví dụ: 05:30)
        public string FormattedDuration { get; set; }   

        public bool IsActive { get; set; } // Kế thừa từ BaseModel
        public DateTime CreatedAt { get; set; }
        public bool IsPreview {  get; set; }
        public bool IsLocked { get; set; }
        public bool IsCompleted {  get; set; }
        public int WatchedLastTime {  get; set; }
    }
}
