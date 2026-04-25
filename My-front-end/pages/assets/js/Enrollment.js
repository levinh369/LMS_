const Enrollment = {
    add: function(courseId, teacherId) {
        const token = localStorage.getItem("jwt_token");
        // Dùng return $.ajax để nó trả về một Promise
        return $.ajax({
            url: 'https://lms-u2jn.onrender.com/api/enroll/register',
            type: 'POST',
            contentType: 'application/json',
            headers: {
            "Authorization": "Bearer " + token 
        },
           data: JSON.stringify({ 
                courseId: parseInt(courseId),
                teacherId: parseInt(teacherId) 
            })
        });
    }
};