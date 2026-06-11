const Enrollment = {
    add: function(courseId, teacherId) {
        const token = localStorage.getItem("jwt_token");
        const userInfoStr = localStorage.getItem("user_info");
        let studentName = "Học viên";
        if (userInfoStr) {
            // 2. Parse chuỗi JSON thành object
            const userInfo = JSON.parse(userInfoStr);
            // 3. Lấy trường username (theo như trong ảnh bác gửi)
            studentName = userInfo.username || "Học viên";
        }
        return $.ajax({
            url: 'https://lms-u2jn.onrender.com/api/enroll/register',
            type: 'POST',
            contentType: 'application/json',
            headers: {
            "Authorization": "Bearer " + token 
        },
           data: JSON.stringify({ 
                courseId: parseInt(courseId),
                teacherId: parseInt(teacherId),
                studentName: studentName
            })
        });
    }
};