const CourseApp = {
    init: function () {
        this.fetchCourse();
    },

    fetchCourse: function () {
        const token = localStorage.getItem("jwt_token") || localStorage.getItem("token");
        const $list = $('#myCoursesList');
        const $empty = $('#emptyCourse');

        $.ajax({
            url: "https://localhost:7106/api/Course/my-course",
            type: 'GET',
            headers: { "Authorization": "Bearer " + token },
            success: (res) => {
                const courses = res.data || res;
                $list.empty();

                if (!courses || courses.length === 0) {
                    $empty.removeClass('d-none');
                    return;
                }

                let htmlContent = '';
                courses.forEach(item => {
                    htmlContent += this.generateCourseCard(item);
                });
                $list.append(htmlContent);
            },
            error: (err) => {
                console.error("Lỗi load khóa học:", err);
                $list.html('<div class="col-12 text-center text-danger py-5">Có lỗi xảy ra khi tải danh sách khóa học.</div>');
            }
        });
    },

    generateCourseCard: function (course) {
        // 1. Xử lý Tiến độ
        const progress = course.progress || 0;
        
        // 2. Xử lý Nút bấm theo tiến độ
        let btnText = "Bắt đầu học";
        if (progress > 0) btnText = "Tiếp tục học";
        if (progress === 100) btnText = "Học lại (Ôn tập)";

        // 3. Xử lý Bài học cuối cùng & Thời gian (LastLearnedFriendly từ DTO bác)
        const lastActivity = course.lastLearnedFriendly || "Chưa bắt đầu";
        const lastLesson = course.lastLessonTitle || "Chưa có bài học";

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card course-card shadow-sm">
                    <div class="course-img-wrapper">
                        <img src="${course.thumbnailUrl || '/assets/img/default-course.png'}" class="course-img">
                    </div>
                    <div class="card-body d-flex flex-direction-column justify-content-between">
                        <div>
                            <h6 class="fw-bold mb-1 text-truncate" title="${course.title}">${course.title}</h6>
                            <p class="text-muted mb-2" style="font-size: 0.85rem;">Giảng viên: ${course.instructorName}</p>
                            
                            <div class="d-flex align-items-center mb-3 text-secondary" style="font-size: 0.75rem;">
                                <i class="bi bi-clock-history me-1"></i>
                                <span>${lastActivity}</span>
                            </div>

                            <div class="last-lesson mb-3 border-start border-3 ps-2">
                                <span class="d-block text-muted small">Học tiếp:</span>
                                <span class="fw-medium text-dark">${lastLesson}</span>
                            </div>
                        </div>

                        <div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between mb-1" style="font-size: 0.75rem;">
                                    <span class="text-muted">Hoàn thành ${progress}%</span>
                                    <span class="fw-bold text-success">${course.completedLessons || 0}/${course.totalLessons || 0} bài</span>
                                </div>
                                <div class="progress">
                                    <div class="progress-bar" style="width: ${progress}%"></div>
                                </div>
                            </div>
                            
                            <a href="/pages/learn/learning.html?id=${course.courseId}" class="btn-start">
                                ${btnText}
                            </a>
                        </div>
                    </div>
                </div>
            </div>`;
    }
};

$(document).ready(function () {
    CourseApp.init();
});