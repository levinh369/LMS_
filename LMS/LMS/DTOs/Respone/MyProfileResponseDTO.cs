namespace LMS.DTOs.Respone
{
    public class MyProfileResponseDTO
    {
            // Thông tin cá nhân
            public string FullName { get; set; }
            public string Avatar { get; set; }
            public string JoinDate { get; set; } // Ví dụ: "Tháng 02/2026"

            // Thống kê số lượng
            public int OngoingCount { get; set; }
            public int CompletedCount { get; set; }

            // Danh sách khóa học
            public List<CourseItemProfileDto> OngoingCourses { get; set; }
            public List<CourseItemProfileDto> CompletedCourses { get; set; }
        }

        public class CourseItemProfileDto
        {
            public int CourseId { get; set; }
            public string Title { get; set; }
            public string Thumbnail { get; set; }
            public double Progress { get; set; }
            public DateTime? LastLearned { get; set; }
        }
    
}
