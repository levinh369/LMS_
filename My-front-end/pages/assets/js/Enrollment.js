const Enrollment = {
    add: function(courseId) {
        const token = localStorage.getItem("jwt_token");
        // Dùng return $.ajax để nó trả về một Promise
        return $.ajax({
            url: 'http://vinh369-001-site1.site4future.com/api/enroll/register',
            type: 'POST',
            contentType: 'application/json',
            headers: {
            "Authorization": "Bearer " + token 
        },
            data: JSON.stringify({ courseId: parseInt(courseId) })
            // KHÔNG cần ghi Header ở đây nữa vì $.ajaxSetup đã lo rồi
        });
    }
};