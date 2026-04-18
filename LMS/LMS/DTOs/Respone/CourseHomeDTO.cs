namespace LMS.DTOs.Respone
{
    public class CourseHomeDTO
    {
        public int Id { get; set; }

        public string Title { get; set; }

        public string Thumbnail { get; set; }

        public string InstructorName { get; set; }

        public string InstructorAvatar { get; set; }

        public decimal Price { get; set; }

        public int TotalLessons { get; set; }

        // Chuỗi hiển thị thời lượng (VD: "15h 30m")
        public string DurationDisplay { get; set; }

        // Thuộc tính logic để Frontend hiển thị Badge
        public bool IsNew { get; set; }

        public bool IsBestSeller { get; set; }

        // Tên danh mục (Web, Mobile...) để lọc
        public string CategoryName { get; set; }
    }
}
