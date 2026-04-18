using LMS.Models;
using Microsoft.EntityFrameworkCore;

namespace LMS.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
           : base(options)
        {
        }
        public DbSet<UserModel> Users { get; set; }
        public DbSet<CategoryModel> Categories { get; set; }    
        public DbSet<CourseModel> Courses { get; set; }
        public DbSet<LessonModel> Lessons { get; set; }
        public DbSet<RoleModel> Roles { get; set; }
        public DbSet<UserProgressModel> UsersProgress { get; set; }
        public DbSet<EnrollmentModel> Enrollments { get; set; }
        public DbSet<ChapterModel> Chapters { get; set; }
        public DbSet<CourseDetailModel> courseDetails { get; set; }
        public DbSet<RoadMapModel> RoadMapModels { get; set; }
        public DbSet<CommentModel> Comments { get; set; }
        public DbSet<RoadmapCourseModel> RoadmapCourseModels { get;set; }
        public DbSet<CommentLikeModel> CommentLikes { get; set; }
        public DbSet<NotificationModel> NotificationModels { get; set; }
        public DbSet<OrderModel> Orders { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // --- 1. CẤU HÌNH CHO BẢNG LIKE (CommentLikeModel) ---

            // Đặt Id làm khóa chính duy nhất (Để nó tự tăng IDENTITY)
            modelBuilder.Entity<CommentLikeModel>()
                .HasKey(l => l.Id);

            // Tạo Index Unique: Đây là "bùa" để 1 ông User không thể Like 1 cái Comment 2 lần
            modelBuilder.Entity<CommentLikeModel>()
                .HasIndex(l => new { l.UserId, l.CommentId })
                .IsUnique();

            // Khi xóa Comment -> Xóa Like (Cascade)
            modelBuilder.Entity<CommentLikeModel>()
                .HasOne(l => l.Comment)
                .WithMany(c => c.Likes)
                .HasForeignKey(l => l.CommentId)
                .OnDelete(DeleteBehavior.Cascade);

            // Khi xóa User -> Không xóa Like (Chặn Multiple Cascade Paths)
            modelBuilder.Entity<CommentLikeModel>()
                .HasOne(l => l.User)
                .WithMany()
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.NoAction);


            // --- 2. CẤU HÌNH CHO TIẾN ĐỘ HỌC TẬP (UserProgressModel) ---

            modelBuilder.Entity<UserProgressModel>()
                .HasOne(p => p.Course)
                .WithMany()
                .HasForeignKey(p => p.CourseId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }

}
