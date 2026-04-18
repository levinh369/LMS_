const Enrollment = {
    add: function(courseId) {
        const token = localStorage.getItem("jwt_token");
        // Dùng return $.ajax để nó trả về một Promise
        return $.ajax({
            url: 'https://localhost:7106/api/enroll/register',
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