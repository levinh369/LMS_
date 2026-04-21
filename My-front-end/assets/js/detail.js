
var Detail = {
    currentLessons: [], // Sẽ chứa danh sách phẳng của tất cả bài học để hiện trong Modal
    config: {
        apiUrl: "https://localhost:7106/api/course"
    },
    init: function () {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        this.checkAndHandleToken();
        if (id) {
            Detail.detail(id);
        } else {
            alert("Không tìm thấy mã khóa học bác ơi!");
            window.location.href = "index.html";
        }
    },
  detail: async function (id) {
        try {
            const token = localStorage.getItem("jwt_token"); 
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${Detail.config.apiUrl}/course-detail/${id}`, {
                method: 'GET',
                headers: headers
            });

            const res = await response.json();
            if (res.success) {
                const detailData = res.data || res.Data;
                Detail.currentLessons = detailData.chapters.flatMap(c => c.lessons);
                
                // 1. Vẽ thông tin khóa học trước
                Detail.renderDetail(detailData);
                
                // 2. Kiểm tra và vẽ nút bấm phù hợp (Đăng ký / Vào học)
                Detail.renderEnrollButton(); 
            }
        } catch (error) {
            console.error("Lỗi:", error);
        }
    },
   renderDetail: function(data) {
    // 1. Thông tin cơ bản & Header
    $('#courseTitle').text(data.title);
    $('#currentCourseId').val(data.courseId);
    
    // Xử lý mô tả ngắn (Lead)
    const shortDesc = data.description ? data.description.replace(/<[^>]*>/g, '').substring(0, 160) + "..." : "Khóa học chất lượng cao dành cho bạn.";
    $('#courseLead').text(shortDesc);
    
    // Giảng viên (Thêm Avatar nếu có)
    $('#instructorName').text(data.instructorName || "Giảng viên LMS");
    if (data.instructorUrl) {
        $('#instructorAvatar').attr('src', data.instructorUrl);
    }

    // Thời gian cập nhật & Badge Level
    const updateDate = new Date(data.createAt).toLocaleDateString('vi-VN');
    $('#lastUpdated').text(`Cập nhật lần cuối: ${updateDate}`);
    
    // 2. Sidebar Stats (Giá & Thông số)
    const isFree = data.price === 0;
    const priceText = isFree ? 'Miễn phí' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.price);
    
    $('#coursePrice').text(priceText)
        .removeClass('text-danger text-success')
        .addClass(isFree ? 'text-success' : 'text-danger');

    $('#enrollNumber').text(data.totalEnrolled.toLocaleString());
    $('#totalChapters').text(data.totalChapters || 0);
    $('#totalLessons').text(data.totalLessons || 0);
    
    // Format thời lượng từ giây sang hh:mm
    const durationDisplay = Detail.formatDuration(data.totalDurationSeconds);
    $('#totalDuration').text(durationDisplay);
    
    // Cấp độ khóa học (Dùng Badge Bootstrap)
    const levelMap = { 0: 'Cơ bản', 1: 'Trung bình', 2: 'Nâng cao' };
    $('#courseLevel').text(levelMap[data.level] || 'Mọi cấp độ');

    // 3. Hình ảnh & Mô tả chi tiết
    $('#courseThumbnail').attr('src', data.thumbnailUrl || '../../assets/img/default-course.png');
    $('#courseDescription').html(data.description || 'Đang cập nhật nội dung...');

    // 4. Vẽ Benefits (Lợi ích khóa học)
    let benefitsHtml = '';
    if (data.courseDetails && data.courseDetails.length > 0) {
        data.courseDetails.forEach(item => {
            const isBenefit = item.detailType === 0; // 0 là lợi ích, 1 là yêu cầu
            benefitsHtml += `
                <div class="col-md-6 mb-2 d-flex align-items-start">
                    <div class="flex-shrink-0 mt-1">
                        <i class="bi ${isBenefit ? 'bi-patch-check-fill text-primary' : 'bi-arrow-right-circle text-secondary'}"></i>
                    </div>
                    <div class="ms-2 text-dark small">
                        ${item.content}
                    </div>
                </div>`;
        });
    }
    $('#benefitsContainer').html(benefitsHtml || '<p class="small text-muted ps-3">Thông tin đang được cập nhật...</p>');

    // 5. Trạng thái nút bấm (Đã đăng ký hay chưa)
    if (data.isEnrolled) {
        $('#btnEnroll').html('<i class="bi bi-play-fill me-1"></i> Vào học ngay')
                       .removeClass('btn-primary').addClass('btn-success');
    } else {
        $('#btnEnroll').html(isFree ? 'Đăng ký học miễn phí' : 'Mua khóa học ngay')
                       .removeClass('btn-success').addClass('btn-primary');
    }


        let chapterHtml = '';
        if (data.chapters && data.chapters.length > 0) {
            data.chapters.sort((a, b) => a.order - b.order).forEach((chapter, cIndex) => {
                let lessonHtml = '';
                chapter.lessons.forEach((lesson, lIndex) => {
                    const isPreview = lesson.isPreview;
                    const icon = isPreview ? 'bi-play-circle-fill text-primary' : 'bi-lock-fill text-muted';
                    const action = isPreview 
                        ? `<button onclick="Detail.openVideo('${lesson.videoId}')" class="btn btn-sm btn-outline-primary rounded-pill px-3">Học thử</button>`
                        : `<i class="bi bi-lock-fill text-muted fs-5"></i>`;

                    lessonHtml += `
                        <div class="list-group-item d-flex justify-content-between align-items-center py-3 border-0 border-bottom curriculum-item">
                            <div class="d-flex align-items-center">
                                <i class="bi ${icon} me-3 fs-5"></i>
                                <span class="${isPreview ? 'fw-bold text-dark' : 'text-secondary'}">${lIndex + 1}. ${lesson.title}</span>
                                ${isPreview ? '<span class="badge bg-success-subtle text-success ms-2" style="font-size: 10px">Học thử</span>' : ''}
                            </div>
                            <div class="text-end">
                               <span class="small text-muted me-3">
        ${lesson.duration > 0 ? Detail.formatLessonTime(lesson.duration) : '00:00'}
    </span>
                                ${action}
                            </div>
                        </div>`;
                });

                chapterHtml += `
                    <div class="accordion-item border-0 border-bottom">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed fw-bold bg-light py-3" type="button" data-bs-toggle="collapse" data-bs-target="#chapter-${chapter.id}">
                                <div class="d-flex flex-column">
                                    <span>Chương ${cIndex + 1}: ${chapter.title}</span>
                                    <span class="fw-normal text-muted" style="font-size: 0.75rem;">${chapter.lessons.length} bài giảng</span>
                                </div>
                            </button>
                        </h2>
                        <div id="chapter-${chapter.id}" class="accordion-collapse collapse">
                            <div class="accordion-body p-0">${lessonHtml}</div>
                        </div>
                    </div>`;
            });
        }
        $('#curriculumList').html(chapterHtml);

        // --- Gán sự kiện cho Thumbnail Preview ---
        const firstPreview = Detail.currentLessons.find(l => l.isPreview);
        if (firstPreview) {
            $('#videoPreviewTrigger').off('click').on('click', () => Detail.openVideo(firstPreview.videoId));
        }
    },
handlePayment: function (courseId, orderId = 0) {
    // 1. Kiểm tra ID (nếu mua mới thì cần courseId, nếu thanh toán lại thì cần orderId)
    if (!courseId && !orderId) {
        Swal.fire('Lỗi', 'Thông tin thanh toán không hợp lệ', 'warning');
        return;
    }

    // 2. Gác cổng Login
    AuthHelper.handleAuthRequired(async function() {
        const token = localStorage.getItem('jwt_token');
        
        Swal.showLoading();

        // 3. Chuẩn bị dữ liệu gửi đi (khớp với PaymentRequest DTO bên C#)
        const paymentData = {
            courseId: parseInt(courseId) || 0,
            orderId: parseInt(orderId) || 0
        };

        // 4. Gọi API
        $.ajax({
            url: 'https://localhost:7106/api/Payment/create-payment',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(paymentData), // Gửi Object thay vì gửi mỗi cái ID lẻ
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            },
            success: function (res) {
                if (res.paymentUrl) {
                    // Phi thẳng sang VNPay
                    window.location.href = res.paymentUrl;
                } else {
                    Swal.fire('Lỗi', 'Không nhận được URL thanh toán từ hệ thống', 'error');
                }
            },
            error: function (err) {
                const errorData = err.responseJSON;
                const message = errorData?.message || "Thử lại sau nhé!";
                
                // Logic thông minh: Nếu đã mua rồi thì đẩy vào học luôn
                if (message.includes("đã được đăng ký") || message.includes("đã mua") || message.includes("đã sở hữu")) {
                    window.location.href = `/pages/learn/index.html?id=${courseId}`;
                } else {
                    Swal.fire('Lỗi thanh toán', message, 'error');
                }
            }
        });
    });
},
openVideo: function(videoId) {
    if (!videoId || videoId === 'undefined' || videoId === null) {
        alert("Bài này chưa có video bác ơi!");
        return;
    }

    // 1. Xử lý URL video dùng replace để không lưu history
    const cleanId = videoId.trim().split(' ')[0];
    const videoUrl = `https://www.youtube.com/embed/${cleanId}?autoplay=1&rel=0`;
    
    const iframe = document.getElementById('videoIframe');
    if (iframe) {
        // Dùng replace để khi bấm Back trình duyệt không bị kẹt trong đống video đã xem
        iframe.contentWindow.location.replace(videoUrl);
    }
    let html = '';
    if (Detail.currentLessons && Detail.currentLessons.length > 0) {
        Detail.currentLessons.forEach((item, index) => {
            const itemCleanId = (item.videoId || "").trim().split(' ')[0];
            const isPlaying = itemCleanId === cleanId;
            const canWatch = item.isPreview; 

            html += `
            <a href="javascript:void(0)" 
               ${canWatch ? `onclick="Detail.openVideo('${item.videoId}')"` : ''} 
               class="list-group-item list-group-item-action py-3 ${isPlaying ? 'bg-primary bg-opacity-10' : ''} border-0 border-bottom ${!canWatch ? 'opacity-50' : ''}">
                <div class="d-flex align-items-center">
                    <i class="bi ${isPlaying ? 'bi-play-circle-fill text-primary' : (canWatch ? 'bi-play-circle' : 'bi-lock')} me-2 fs-5"></i>
                    <div class="small">
                        <div class="${isPlaying ? 'fw-bold text-primary' : ''}">${index + 1}. ${item.title}</div>
                        <span class="text-muted" style="font-size: 0.75rem;">
            <i class="bi bi-play-circle me-1"></i> 
            ${Detail.formatLessonTime(item.duration)}
        </span>
                    </div>
                </div>
            </a>`;
        });
    }
    
    // Đổ dữ liệu vào list trong modal
    $('#modalLessonList').html(html || '<p class="text-center p-3 small text-muted">Không có danh sách bài học</p>');

    // 3. Khởi tạo và hiển thị Modal
    const modalElement = document.getElementById('videoModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();

    // 4. Xử lý khi đóng modal
    $(modalElement).off('hidden.bs.modal').on('hidden.bs.modal', function () {
        // Dùng replace để clear iframe mà không tạo history mới
        if (iframe) {
            iframe.contentWindow.location.replace('about:blank');
        }
    });
},
formatDuration: function(seconds) {
    if (!seconds || seconds <= 0) return "0 phút";

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60; // Nếu bác muốn hiện cả giây thì dùng cái này

    // Trường hợp 1: Có giờ (Ví dụ: 1 giờ 20 phút)
    if (h > 0) {
        return `${h} giờ ${m.toString().padStart(2, '0')} phút`;
    }

    // Trường hợp 2: Chỉ có phút (Ví dụ: 8 phút)
    return `${m} phút`;
},
formatLessonTime: function(seconds) {
    if (!seconds || seconds <= 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    // padStart(2, '0') giúp số 5 biến thành 05
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
},
handleEnroll: function() {
    debugger
    const courseId = new URLSearchParams(window.location.search).get('id');
    
    if (!courseId) {
        Swal.fire('Lỗi', 'ID khóa học không hợp lệ', 'warning');
        return;
    }

    // Gác cổng: Chưa login thì bắt login xong mới chạy tiếp callback bên trong
   AuthHelper.handleAuthRequired(async function() {
    Swal.showLoading();

    try {
        // Gọi API qua jQuery Ajax
        debugger
        const result = await Enrollment.add(courseId); 

        // Nếu Backend của bác trả về { success: true, ... }
        if (result.success || result.isSuccess) {
            Swal.fire({
                icon: 'success',
                title: 'Đăng kí khóa học thành công. Đang chuyển hướng!',
                timer: 3000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = `/pages/learn/learning.html?id=${courseId}`;
            });
        } 
    } catch (xhr) {
        // Nếu lỗi (400, 401, 500...), nó sẽ nhảy xuống đây
        const errorData = xhr.responseJSON;
        const message = errorData ? errorData.message : "Không kết nối được server!";
        
        if (message.includes("đã được đăng ký")) {
            window.location.href = `/pages/learn/learning.html?id=${courseId}`;
        } else {
            Swal.fire('Thất bại', message, 'error');
        }
    }
});
},
renderEnrollButton: async function() {
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');
        const token = localStorage.getItem('jwt_token'); 
        
        // Nếu chưa login -> Chắc chắn chưa mua
        if (!token) {
            this.showEnrollButton(courseId, false);
            return;
        }

        try {
            // Gọi API check xem user này đã sở hữu khóa học chưa
            const response = await fetch(`https://localhost:7106/api/enroll/check/${courseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            // Truyền trạng thái isEnrolled (true/false) vào hàm hiển thị
            this.showEnrollButton(courseId, data.isEnrolled); 
            
        } catch (err) {
            console.error("Lỗi check enroll:", err);
            this.showEnrollButton(courseId, false);
        }
    },

    // 3. Hàm vẽ giao diện nút (Trạm điều hướng chính)
    showEnrollButton: function(courseId, isPurchased) {
        const container = $('#enroll-container');
        
        // TRƯỜNG HỢP 1: ĐÃ SỞ HỮU (Mua rồi hoặc Free đã đăng ký)
        if (isPurchased) {
            container.html(`
                <a href="/pages/learn/learning.html?id=${courseId}" 
                   class="btn btn-success w-100 rounded-pill py-3 fw-bold shadow-sm animate__animated animate__fadeIn">
                    <i class="bi bi-play-circle-fill me-2"></i> TIẾP TỤC HỌC
                </a>
            `);
            return;
        }

        // TRƯỜNG HỢP 2: CHƯA SỞ HỮU -> Check giá để hiện nút phù hợp
        const priceText = $('#coursePrice').text().replace(/[^0-9]/g, '');
        const price = parseInt(priceText) || 0;

        if (price > 0) {
            // Khóa học mất phí
            container.html(`
                <button type="button" 
                        onclick="Detail.handlePayment(${courseId},0)" 
                        class="btn btn-danger w-100 rounded-pill py-3 fw-bold shadow-sm animate__animated animate__pulse animate__infinite">
                    <i class="bi bi-cart-check-fill me-2"></i> MUA KHÓA HỌC NGAY
                </button>
            `);
        } else {
            // Khóa học miễn phí
            container.html(`
                <button type="button" 
                        onclick="Detail.handleEnroll(${courseId})" 
                        class="btn btn-primary w-100 rounded-pill py-3 fw-bold shadow-sm">
                    ĐĂNG KÝ HỌC MIỄN PHÍ
                </button>
            `);
        }
    },
    checkAndHandleToken: function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    // Chỉ thực hiện nếu có token (vừa login xong mới có)
    if (tokenFromUrl) {
        console.log("🎯 Phát hiện Token từ Login Social. Đang lưu Session...");
        
        // 1. Lưu JWT và các thông tin đi kèm
        localStorage.setItem("jwt_token", tokenFromUrl);
        localStorage.setItem("user_id", urlParams.get('userId'));
        
        const userInfo = {
            id: urlParams.get('userId'),
            username: decodeURIComponent(urlParams.get('username') || ""),
            role: urlParams.get('role'),
            avatar: decodeURIComponent(urlParams.get('avatar') || "")
        };
        localStorage.setItem("user_info", JSON.stringify(userInfo));

        // 2. Làm sạch URL (Xóa đống token/username... cho link nó đẹp)
        // Chỉ giữ lại ?id=... để script tiếp theo vẫn biết đang ở khóa học nào
        const courseId = urlParams.get('id');
        const cleanUrl = window.location.origin + window.location.pathname + `?id=${courseId}`;
        window.history.replaceState({}, document.title, cleanUrl);
        
        console.log("✅ Đã lưu xong JWT. Sẵn sàng gọi API check-enroll!");
    }
}
};
$(document).ready(function() {
    if (window.location.pathname.includes('my-order')) {
        return;
    }
    Detail.init();
});


