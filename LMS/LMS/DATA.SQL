-- ==========================================================
-- 1. ROLE & USER (Gốc của hệ thống)
-- ==========================================================
SET IDENTITY_INSERT [RoleModels] ON;
INSERT INTO [RoleModels] ([Id], [RoleName], [Description], [CreatedAt], [UpdatedAt], [IsDeleted], [IsActive]) VALUES 
(1, N'Admin', N'Quản trị', GETDATE(), GETDATE(), 0, 1),
(2, N'Teacher', N'Giảng viên', GETDATE(), GETDATE(), 0, 1),
(3, N'Student', N'Học viên', GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [RoleModels] OFF;

SET IDENTITY_INSERT [UserModels] ON;
INSERT INTO [UserModels] ([Id], [FullName], [Email], [PasswordHash], [RoleId], [Provider], [CreatedAt], [UpdatedAt], [IsDeleted], [IsActive]) VALUES 
(1, N'Lê Quang Vinh', N'vinh.admin@lms.com', N'HASH_ABC', 1, N'Local', GETDATE(), GETDATE(), 0, 1),
(2, N'Nguyễn Giảng Viên', N'gv.namson@lms.com', N'HASH_ABC', 2, N'Local', GETDATE(), GETDATE(), 0, 1),
(3, N'Trần Học Viên', N'student.test@lms.com', N'HASH_ABC', 3, N'Local', GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [UserModels] OFF;

-- ==========================================================
-- 2. CATEGORY & ROADMAP (Phân loại và Lộ trình)
-- ==========================================================
SET IDENTITY_INSERT [CategoryModels] ON;
INSERT INTO [CategoryModels] ([Id], [Name], [Description], [CreatedAt], [UpdatedAt], [IsDeleted], [IsActive]) VALUES 
(1, N'Lập trình .NET', N'C#, ASP.NET Core', GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [CategoryModels] OFF;

SET IDENTITY_INSERT [RoadMapModels] ON;
INSERT INTO [RoadMapModels] ([Id], [Title], [Description], [CreatedAt], [UpdatedAt], [IsDeleted], [IsActive]) VALUES 
(1, N'Lộ trình trở thành Backend Developer', N'Học từ C# đến Web API', GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [RoadMapModels] OFF;

-- ==========================================================
-- 3. COURSE & ROADMAP_COURSE (Khóa học và Gắn lộ trình)
-- ==========================================================
SET IDENTITY_INSERT [CourseModels] ON;
INSERT INTO [CourseModels] ([Id], [Title], [CategoryId], [TeacherId], [Price], [Level], [CreatedAt], [UpdatedAt], [IsDeleted], [IsActive]) VALUES 
(1, N'ASP.NET Core 8 Pro', 1, 2, 500000, 1, GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [CourseModels] OFF;

SET IDENTITY_INSERT [RoadmapCourseModels] ON;
INSERT INTO [RoadmapCourseModels] ([Id], [RoadmapId], [CourseId], [OrderIndex], [PhaseName], [CreatedAt]) VALUES 
(1, 1, 1, 1, N'Giai đoạn khởi đầu', GETDATE());
SET IDENTITY_INSERT [RoadmapCourseModels] OFF;

-- ==========================================================
-- 4. COURSE_DETAIL (Mô tả chi tiết khóa học)
-- ==========================================================
SET IDENTITY_INSERT [CourseDetailModels] ON;
INSERT INTO [CourseDetailModels] ([Id], [CourseId], [Content], [DetailType], [CreatedAt], [UpdatedAt], [IsDeleted], [IsActive]) VALUES 
(1, 1, N'Kiến thức C# cơ bản', 0, GETDATE(), GETDATE(), 0, 1),
(2, 1, N'Máy tính cài Visual Studio', 1, GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [CourseDetailModels] OFF;

-- ==========================================================
-- 5. CHAPTER & LESSON (Nội dung bài học)
-- ==========================================================
SET IDENTITY_INSERT [ChapterModels] ON;
INSERT INTO [ChapterModels] ([Id], [Title], [OrderIndex], [CourseId], [CreatedAt], [UpdatedAt], [IsDeleted], [IsActive]) VALUES 
(1, N'Chương 1: Setup', 1, 1, GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [ChapterModels] OFF;

SET IDENTITY_INSERT [LessonModels] ON;
INSERT INTO [LessonModels] ([Id], [ChapterId], [Title], [Provider], [VideoId], [OrderIndex], [IsPreview], [CreatedAt], [UpdatedAt], [IsDeleted], [IsActive]) VALUES 
(1, 1, N'Bài 1: Cài đặt Tool', N'Youtube', N'vid123', 1, 1, GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [LessonModels] OFF;

-- ==========================================================
-- 6. ENROLLMENT, ORDER, PROGRESS (Theo dõi học tập và Thanh toán)
-- ==========================================================
SET IDENTITY_INSERT [EnrollmentModels] ON;
INSERT INTO [EnrollmentModels] ([Id], [UserId], [CourseId], [IsCompleted], [ProgressPercent], [LastAccessedAt], [CreatedAt], [UpdatedAt], [IsDeleted], [IsActive]) VALUES 
(1, 3, 1, 0, 0, GETDATE(), GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [EnrollmentModels] OFF;

SET IDENTITY_INSERT [OrderModels] ON;
INSERT INTO [OrderModels] ([Id], [UserId], [CourseId], [Amount], [Status], [CreatedAt], [UpdatedAt], [IsDeleted], [IsActive]) VALUES 
(1, 3, 1, 500000, 1, GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [OrderModels] OFF;

SET IDENTITY_INSERT [UserProgressModels] ON;
INSERT INTO [UserProgressModels] ([Id], [UserId], [LessonId], [CourseId], [IsCompleted], [LastWatchedTime], [UpdatedAt], [CreatedAt], [IsDeleted], [IsActive]) VALUES 
(1, 3, 1, 1, 0, 120, GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [UserProgressModels] OFF;

-- ==========================================================
-- 7. COMMENT, LIKE, NOTIFICATION (Tương tác xã hội)
-- ==========================================================
SET IDENTITY_INSERT [CommentModels] ON;
INSERT INTO [CommentModels] ([Id], [Content], [UserId], [LessonId], [ParentId], [IsHidden], [LikeCount], [CreatedAt], [UpdatedAt], [IsDeleted], [IsActive]) VALUES 
(1, N'Code khó quá thầy ơi', 3, 1, NULL, 0, 1, GETDATE(), GETDATE(), 0, 1),
(2, N'Khó mới phải học chứ em', 2, 1, 1, 0, 0, GETDATE(), GETDATE(), 0, 1);
SET IDENTITY_INSERT [CommentModels] OFF;

SET IDENTITY_INSERT [CommentLikeModels] ON;
INSERT INTO [CommentLikeModels] ([Id], [UserId], [CommentId], [Type], [LikedAt]) VALUES 
(1, 1, 1, 1, GETDATE());
SET IDENTITY_INSERT [CommentLikeModels] OFF;

INSERT INTO [NotificationModels] ([UserId], [SenderId], [Message], [RedirectUrl], [Type], [IsRead], [CreatedAt]) VALUES 
(3, 2, N'Giảng viên đã trả lời bình luận của bạn', N'/learning/1/1', 1, 0, GETDATE());