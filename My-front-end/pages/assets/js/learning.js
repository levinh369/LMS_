var player;
var isApiReady = false;
let heartbeatInterval; // Biến giữ nhịp tim
let currentLessonId = 0; 
let currentTeacherId = null;
let currentCommentReactions=[];
var bunnyPlayer = null;
let isCommentLoaded = false;
function onYouTubeIframeAPIReady() {
    console.log("YouTube API: Đã sẵn sàng");
    isApiReady = true;
    player = new YT.Player('youtube-iframe-id', {
        events: {
            
            'onStateChange': onPlayerStateChange // 🚩 MÓC SỰ KIỆN Ở ĐÂY NÀY
        }
    });
}
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end', // Hiện ở góc trên bên phải
    showConfirmButton: false,
    timer: 3000, // Tự đóng sau 3 giây
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});
function onPlayerStateChange(event) {
    // Dùng Learn.currentLessonId thay vì biến tự do
    const activeId = Learn.currentLessonId; 

    if (event.data == YT.PlayerState.ENDED) {
        console.log("Video YouTube kết thúc! Tiến hành chuyển bài...");
        Learn.stopHeartbeat(); 
        if (activeId) {
            Learn.sendProgressToBackend(activeId, 0); 
            Learn.markAsCompleted(activeId);
            
            // 🚩 THÊM TỰ ĐỘNG CHUYỂN BÀI CHO YOUTUBE Ở ĐÂY
            // Gọi hàm nhảy bài đồng bộ với bên Bunny
            if (typeof Learn.nextLesson === 'function') {
                Learn.nextLesson();
            } else if (typeof Learn.playNext === 'function') {
                Learn.playNext();
            } else {
                // Nếu chưa có hàm, click giả lập vào nút "Bài tiếp theo" trên UI
                const nextBtn = $('.btn-next-lesson, #nextLessonBtn');
                if (nextBtn.length > 0) {
                    nextBtn.click();
                }
            }
        }
    }
    else if (event.data == YT.PlayerState.PLAYING) {
        if (activeId) {
            console.log("Đang chơi video, bắt đầu nhịp tim lưu tiến độ...");
            Learn.startHeartbeat(activeId, 'youtube'); 
        }
    }
    else {
        // Tạm dừng (PAUSED) hoặc Buffering thì dừng heartbeat
        Learn.stopHeartbeat();
    }
}

var Learn = {
    commentState: {
    page: 1,
    limit: 20,
    isLoading: false,
    hasMore: true,
    lessonId: null // Nhớ gán giá trị này khi khởi tạo bài học: this.commentState.lessonId = ID_BÀI_HỌC;
},
    config: {
        apiUrl: "https://lms-u2jn.onrender.com/api/Course" 
    },
    lessonsCache: {},
  init: function() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    const lessonIdFromUrl = urlParams.get('lessonId');

    if (courseId) {
        Learn.loadCourseContent(courseId);
    }
    
    $(document).on('shown.bs.tab', '#comment-tab', async function (e) {
    const activeLessonId = Learn.currentLessonId;

    if (!activeLessonId) return; // Phòng hờ khóa học trống, không có bài nào

    // Thêm điều kiện kiểm tra xem ID bình luận hiện tại có khớp với bài đang học không
    // (Tránh lỗi user chuyển bài liên tục nhưng comment chưa kịp update)
    if (!Learn.isCommentLoaded || Learn.commentState.lessonId !== activeLessonId) {
        Learn.commentState.lessonId = activeLessonId;
        Learn.commentState.page = 1;
        Learn.commentState.hasMore = true;
        Learn.commentState.isLoading = false;
        
        Learn.initCommentEvents();
        
        // Đợi API tải xong data
        await Learn.loadParentComments(false);
        Learn.isCommentLoaded = true;

        // Tải xong rồi thì gọi hàm cuộn
        Learn.scrollToHashComment();
    } else {
        // Nếu data đã load từ trước và đúng bài đó rồi
        Learn.scrollToHashComment();
    }
});
    const userInfoRaw = localStorage.getItem("user_info");
    let avatarUrl = '../assets/img/default-avatar.png'; // Mặc định nếu chưa đăng nhập hoặc không có ảnh

    if (userInfoRaw) {
        try {
            const user = JSON.parse(userInfoRaw);
            // 2. Lấy thuộc tính avatar (phòng hờ chuỗi 'null' hoặc rỗng)
            if (user.avatar && user.avatar !== 'null') {
                avatarUrl = user.avatar;
            }
        } catch (e) {
            console.error("Lỗi parse user_info để lấy avatar:", e);
        }
    }

    // 3. Đổ ảnh lên UI
    $('#imgUser').attr('src', avatarUrl);

    // --- TRƯỜNG HỢP: ĐIỀU HƯỚNG TỪ THÔNG BÁO ---
    const hash = window.location.hash;
    if (hash && hash.includes('comment-')) {
        const triggerEl = document.querySelector('#comment-tab');
        if (triggerEl) {
            bootstrap.Tab.getOrCreateInstance(triggerEl).show();
        }
    }
},

scrollToHashComment: async function() {
    const hash = window.location.hash; // Ví dụ: #comment-1392
    const urlParams = new URLSearchParams(window.location.search);
    const parentIdFromUrl = urlParams.get('parentId'); // Lấy ID của comment cha từ URL

    if (hash && hash.includes('comment-')) {
        
        // 1. NẾU LÀ COMMENT CON -> ÉP TẢI DATA COMMENT CON TRƯỚC
        if (parentIdFromUrl) {
            const parentElement = document.querySelector(`#comment-${parentIdFromUrl}`);
            if (parentElement) {
                // Tìm cái nút "Xem phản hồi" của thằng cha
                const replyBtn = parentElement.querySelector('.view-replies-btn');
                if (replyBtn) {
                    // Gọi hàm tải comment con và đợi nó chạy xong
                    await this.loadReplies(parentIdFromUrl, replyBtn);
                }
            } else {
                console.warn("Comment cha không nằm ở trang 1, cần vuốt xuống để tải thêm!");
                // (Trường hợp siêu hiếm: comment cha nằm ở trang 2, trang 3 -> Cái này cần API riêng của Backend mới xử lý triệt để được)
            }
        }

        // 2. DOM ĐÃ CÓ DATA -> THỰC HIỆN CUỘN VÀ TÔ MÀU
        // Dùng setTimeout 300ms để chắc chắn HTML đã được vẽ (render) ra màn hình
        setTimeout(() => {
            const targetComment = document.querySelector(hash);
            
            if (targetComment) {
                // Cuộn tới giữa màn hình
                targetComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Tô màu vàng
                $(targetComment).css('transition', 'background-color 0.5s ease');
                $(targetComment).css('background-color', '#fff3cd'); 
                
                // Xóa màu sau 3s
                setTimeout(() => {
                    $(targetComment).css('background-color', ''); 
                }, 3000);
            } else {
                console.warn("Không tìm thấy bình luận này trong DOM.");
            }
        }, 300);
    }
},
loadCourseContent: async function(courseId) {
    try {
        const token = localStorage.getItem("jwt_token");
        const response = await $.ajax({
            url: `${Learn.config.apiUrl}/course-learning/${courseId}`,
            type: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.success) {
            const data = response.data;
            $('#topCourseTitle').text(data.title);
            const percent = data.progressPercent || 0;
            $('#progressBar').css('width', percent + '%');
            $('#progressBar').attr('aria-valuenow', percent);
            const completed = data.completedLessons || 0;
            const total = data.totalLessons || 0;
            $('#completionStatus').text(`${completed}/${total} bài học`);
            Learn.lessonsCache = {};
            
            data.chapters.forEach(chapter => {
                chapter.lessons.forEach(lesson => {
                    Learn.lessonsCache[lesson.id] = lesson;
                });
            });
            Learn.renderChapters(data.chapters);
            
            // ==========================================
            // FIX LỖI Ở ĐÂY: ƯU TIÊN URL HƠN LÀ RESUME
            // ==========================================
            const urlParams = new URLSearchParams(window.location.search);
            const lessonIdFromUrl = urlParams.get('lessonId');

            if (lessonIdFromUrl && Learn.lessonsCache[lessonIdFromUrl]) {
                console.log("Hệ thống: Phát hiện link chia sẻ/thông báo, mở bài ID:", lessonIdFromUrl);
                this.changeVideo(parseInt(lessonIdFromUrl));
            } 
            else {
                console.log("Đang kiểm tra tiến độ để học tiếp...");
                this.checkResumeProgress(courseId); 
            }
        }
    } catch (error) { 
        console.error("Lỗi khi tải nội dung khóa học:", error); 
        
        // 📍 BẮT TRẠNG THÁI HTTP STATUS CODE TỪ SERVER TRẢ VỀ
        const status = error.status;

        if (status === 403) {
            Swal.fire({
                icon: 'badge-check', // Hoặc dùng 'error', 'warning'
                title: 'Truy cập bị từ chối!',
                text: 'Bạn chưa mua hoặc không có quyền sở hữu khóa học này bác ơi.',
                confirmButtonText: 'Quay lại trang chi tiết',
                confirmButtonColor: '#dc3545',
                allowOutsideClick: false // Ép người dùng không được bấm ra ngoài tắt thông báo
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = `/course-detail.html?id=${courseId}`;
                }
            });
            return;
        }

        if (status === 401) {
            Swal.fire({
                icon: 'warning',
                title: 'Phiên làm việc hết hạn',
                text: 'Vui lòng đăng nhập lại để tiếp tục học tập nhé.',
                confirmButtonText: 'Đăng nhập ngay',
                confirmButtonColor: '#0d6efd',
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = "/auth/login.html";
                }
            });
            return;
        }

        // Trường hợp lỗi server/mạng thông thường khác
        Swal.fire({
            icon: 'error',
            title: 'Có lỗi xảy ra',
            text: 'Hệ thống gặp sự cố khi tải bài học. Vui lòng thử lại sau!',
            confirmButtonColor: '#6c757d'
        });
    }
},
updateHeaderProgress: function(completed, total) {
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Cập nhật Progress Bar với hiệu ứng mượt
    $('#progressBar').animate({ width: percent + '%' }, 400); 
    $('#progressBar').attr('aria-valuenow', percent);
    
    // Cập nhật text
    $('#completionStatus').text(`${completed}/${total} bài học`);
},
changeVideo: async function(newLessonId) {
        console.log("Đang chuyển sang bài học:", newLessonId);
        isCommentLoaded = false;
        
        // BƯỚC 1: CHỐT HẠ BÀI CŨ TRƯỚC KHI CHUYỂN
        if (currentLessonId !== 0 && currentLessonId !== newLessonId) {
            try {
                let lastTime = 0;
                const oldLesson = Learn.lessonsCache[currentLessonId] || {};

                if (oldLesson.provider === "Bunny") {
                    lastTime = window.currentBunnySeconds || 0; 
                } else if (window.player && typeof window.player.getCurrentTime === 'function') {
                    // Dùng window.player để đồng bộ biến
                    lastTime = Math.floor(window.player.getCurrentTime() || 0);
                }

                if (lastTime >= 20) {
                    Learn.sendProgressToBackend(currentLessonId, lastTime);
                }
            } catch (err) {
                console.error("Lỗi khi chốt bài cũ, vẫn tiếp tục mở bài mới:", err);
            }
        }

        // BƯỚC 2: CẬP NHẬT ID MỚI XUYÊN SUỐT
        currentLessonId = newLessonId;
        this.currentLessonId = newLessonId; 

        const newLesson = Learn.lessonsCache[newLessonId];
        if (!newLesson) return;

        Learn.stopHeartbeat();
        const startTime = newLesson.watchedLastTime || 0;

        // BƯỚC 3: LOAD VIDEO TƯƠNG ỨNG
        if (newLesson.provider === "Bunny") {
            this.renderBunny(newLesson.videoId.trim(), startTime);
        } else {
            this.renderYouTube(newLesson.videoId.trim(), startTime);
        }

        // BƯỚC 4: RENDER GIAO DIỆN UI
        $('#currentLessonTitle').text(newLesson.title);
        $('.lesson-item').removeClass('active');
        $(`#lesson-${newLessonId}`).addClass('active');
        
        if ($('#comment-tab').hasClass('active')) {
            $('#comment-tab').trigger('shown.bs.tab');
        } else {
            $('#commentList').empty(); 
        }
    },

    // --- HÀM 3: RENDER YOUTUBE ---
    renderYouTube: function(videoId, startTime) {
        let container = document.getElementById('bunnyVideoPlayer')?.parentElement 
                     || document.getElementById('mainVideoFrame')?.parentElement
                     || document.querySelector('.video-container') 
                     || document.querySelector('.video-player-box');

        if (!container) return console.error("❌ Không tìm thấy khung chứa video!");

        // Dọn dẹp tàn dư cũ để tránh kẹt iframe
        if (window.player && typeof window.player.destroy === 'function') {
            try { window.player.destroy(); } catch(e){}
        }

        // Đổ thẻ HTML sạch vào
        container.innerHTML = `<div id="mainVideoFrame" style="width: 100%; height: 100%;"></div>`;

        // Khởi tạo YT API gắn vào thẻ div vừa tạo
        window.player = new YT.Player('mainVideoFrame', {
            width: '100%',
            height: '100%',
            videoId: videoId,
            playerVars: { 
                'autoplay': 1, 
                'start': startTime, 
                'enablejsapi': 1, // <== Chìa khóa vàng
                'origin': window.location.origin,
                'rel': 0
            },
            events: { 
                'onStateChange': typeof onPlayerStateChange !== 'undefined' ? onPlayerStateChange : null 
            }
        });
    },

renderBunny: function(videoId, startTime) {
    // 1. TÌM HOẶC KHÔI PHỤC CONTAINER AN TOÀN
    let container = document.getElementById('bunnyVideoPlayer')?.parentElement 
                 || document.getElementById('mainVideoFrame')?.parentElement
                 || document.querySelector('.video-container') 
                 || document.querySelector('.video-player-box');

    if (!container) {
        console.error("❌ Không tìm thấy khung chứa video!");
        return;
    }

    const activeLessonId = Learn.currentLessonId;

    // 2. GỌI API BACKEND LẤY LINK TOKEN
    fetch(`https://lms-u2jn.onrender.com/api/Lesson/${activeLessonId}/secure-video-url`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Lỗi API Backend: Status ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (!data.secureUrl) {
            console.error("❌ Không lấy được secureUrl từ Backend!");
            return;
        }

        const finalSecureUrl = `${data.secureUrl}&autoplay=true&start=${startTime}`;

        // 3. RENDER IFRAME (Dùng CSS chuẩn chỉnh để co giãn theo khung cha)
        container.style.position = "relative"; 
        container.innerHTML = `<iframe id="bunnyVideoPlayer" src="${finalSecureUrl}" style="border: none; width: 100%; height: 100%; min-height: 450px;" allow="autoplay; fullscreen" referrerpolicy="origin"></iframe>`;

        // 4. BẬT TRẠNG THÁI & LẮNG NGHE SỰ KIỆN
        window.currentBunnySeconds = parseInt(startTime) || 0;
        window.isWatching = true; 

        if (!window.hasBunnyListener) {
            window.addEventListener("message", function(event) {
                // 🎯 FIX CHÍ MẠNG: Bỏ qua check cứng "iframe.mediadelivery.net" 
                // Vì khi chạy link Secure Token, origin sẽ là tên miền mã hóa riêng của video.
                // Chỉ cần kiểm tra dữ liệu có chứa thuộc tính của Bunny Player là được.
                
                try {
                    const bunnyData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    
                    // Kiểm tra xem có đúng cấu trúc event của Bunny không
                    if (!bunnyData || (!bunnyData.event && !bunnyData.eventName)) return;
                    const eventName = bunnyData.event || bunnyData.eventName;

                    if (eventName === "play") {
                        window.isWatching = true;
                        Learn.startHeartbeat(activeLessonId, 'bunny');
                    } 
                    else if (eventName === "pause") {
                        window.isWatching = false;
                        Learn.stopHeartbeat();
                    }
                    else if (eventName === "ended") {
                        window.isWatching = false;
                        Learn.stopHeartbeat();
                        // 🔥 TỰ ĐỘNG CHUYỂN BÀI KHI HẾT VIDEO:
                        // Bác gọi hàm chuyển bài tiếp theo của bác ở đây, ví dụ:
                        if (typeof Learn.nextLesson === 'function') {
                            Learn.nextLesson();
                        } else {
                            console.log("Video Bunny đã hết! Bác hãy gọi hàm chuyển bài tiếp theo ở đây.");
                        }
                    }
                } catch (e) {}
            });
            window.hasBunnyListener = true;
        }

        // Chạy heartbeat phát đầu
        Learn.startHeartbeat(activeLessonId, 'bunny');
    })
    .catch(err => {
        console.error("❌ Lỗi luồng bảo mật Token:", err);
        if (typeof Toast !== 'undefined') {
            Toast.fire({ icon: 'error', title: 'Không thể tải link video bảo mật!' });
        }
    });
},
    renderChapters: function(chapters) {
        let html = "";
        chapters.forEach((chapter, index) => {
            const collapseId = `chapter-${chapter.id}`;
            html += `
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button ${index === 0 ? '' : 'collapsed'} fw-bold" 
                                type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                            ${chapter.title}
                        </button>
                    </h2>
                    <div id="${collapseId}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#chapterAccordion">
                        <div class="accordion-body p-0">
                            <div class="list-group list-group-flush">
                                ${chapter.lessons.map(lesson => {
                                    let iconClass = lesson.isLocked ? "bi-lock-fill text-muted" : (lesson.isCompleted ? "bi-check-circle-fill text-success" : "bi-play-circle text-primary");
                                    
                                    // 4. ONCLICK GIỜ CHỈ TRUYỀN ID
                                    const clickAction = lesson.isLocked 
                                        ? `Swal.fire('Thông báo', 'Bác phải học xong bài trước!', 'info')`
                                        : `Learn.changeVideo(${lesson.id})`;

                                    return `
                                        <div class="list-group-item lesson-item ${lesson.isLocked ? 'opacity-50' : ''}" 
                                             id="lesson-${lesson.id}" 
                                             data-id="${lesson.id}"
                                             style="${lesson.isLocked ? 'cursor: not-allowed;' : 'cursor: pointer;'}"
                                             onclick="${clickAction}">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div class="small fw-semibold">${lesson.title}</div>
                                                <i class="bi ${iconClass}"></i>
                                            </div>
                                        </div>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        $('#chapterAccordion').html(html);
    },
markAsCompleted: async function(lessonId) {
   const token = localStorage.getItem("jwt_token");
    try {
        // 1. TÌM BÀI TIẾP THEO HỢP LỆ (Tự động nhảy cóc qua các bài bị khóa)
        const allLessons = $('.lesson-item'); 
        const currentIndex = allLessons.index($(`#lesson-${lessonId}`));
        let nextLessonId = null;

        if (currentIndex !== -1) {
            // Quét từ vị trí kế tiếp cho đến hết danh sách
            for (let i = currentIndex + 1; i < allLessons.length; i++) {
                const tempElement = allLessons.eq(i);
                const tempId = parseInt(tempElement.attr('id').replace('lesson-', ''));
                
                // 🎯 ĐIỀU KIỆN CHỐT: Bài học phải tồn tại trong cache (không bị khóa/xóa)
                if (Learn.lessonsCache[tempId]) {
                    nextLessonId = tempId;
                    break; // Tìm thấy bài ngon rồi thì dừng vòng lặp luôn!
                }
            }
        }
        // 2. GỌI API BÁO HOÀN THÀNH
        const response = await $.ajax({
            url: `${Learn.config.apiUrl}/complete-lesson/${lessonId}`,
            type: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.success) {
            // CẬP NHẬT PROGRESS BAR NGAY LẬP TỨC (Dùng dữ liệu mới nhất từ Repo trả về)
            this.updateHeaderProgress(response.completedCount, response.totalCount);
            // 3. KIỂM TRA PHÁ ĐẢO (isFinished từ Backend)
            if (response.isFinished) {
                // NỔ PHÁO HOA TƯNG BỪNG
                this.triggerFireworks(); 

                Swal.fire({
                    icon: 'success',
                    title: '🎉 XUẤT SẮC!',
                    text: 'Bác đã hoàn thành 100% khóa học. Đang đưa bác về trang chủ...',
                    timer: 2500, // Đợi 2.5s để ngắm pháo hoa
                    showConfirmButton: false,
                    willClose: () => {
                        window.location.href = '/'; // Quay về trang chủ
                    }
                });
                return; // Kết thúc hàm tại đây, không cần chạy logic chuyển bài tiếp theo
            }

            // 4. NẾU CHƯA XONG HẾT KHÓA HỌC
            Swal.fire({
                icon: 'success',
                title: 'Tuyệt vời!',
                text: nextLessonId ? 'Đang chuyển bài tiếp theo...' : 'Bác đã xem hết các bài!',
                timer: 1000,
                showConfirmButton: false
            });

            if (nextLessonId) {
                setTimeout(() => {
                    this.changeVideo(nextLessonId);
                }, 800);
            }

            // Cập nhật lại Sidebar để hiện dấu tích xanh
            const courseId = new URLSearchParams(window.location.search).get('id');
            this.loadCourseContent(courseId);
        }
    } catch (error) {
        console.error("Lỗi hoàn thành bài:", error);
    }
},

// HÀM NỔ PHÁO HOA (Thêm vào trong object Learn của bác)
triggerFireworks: function() {
    var duration = 2 * 1000;
    var end = Date.now() + duration;

    (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ffd700', '#ffffff'] });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ffd700', '#ffffff'] });
        if (Date.now() < end) { requestAnimationFrame(frame); }
    }());
},
startHeartbeat: function(lessonId, type = 'youtube') {
    currentLessonId = lessonId;
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    heartbeatInterval = setInterval(() => {
        if (type === 'youtube' && player && typeof player.getCurrentTime === 'function') {
            if (player.getPlayerState() === YT.PlayerState.PLAYING) {
                Learn.sendProgressToBackend(lessonId, Math.floor(player.getCurrentTime()));
            }
        } 
        else if (type === 'bunny') {
    window.currentBunnySeconds += 20; 
    debugger
    let currentTime = window.currentBunnySeconds;
    Learn.sendProgressToBackend(lessonId, currentTime);
}
    }, 20000); 
},
    stopHeartbeat: function() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            console.log("Heartbeat stopped.");
        }
    },

    sendProgressToBackend: function(lessonId, time) {
        const token = localStorage.getItem("jwt_token");
        $.ajax({
            url: `${Learn.config.apiUrl}/update-last-watched`,
            type: 'POST',
            contentType: 'application/json',
            headers: { 'Authorization': `Bearer ${token}` },
            data: JSON.stringify({ lessonId: lessonId, lastTime: time }),
            success: function() { 
                // CẬP NHẬT LUÔN VÀO BỘ NHỚ TẠM
                if (Learn.lessonsCache[lessonId]) {
                    Learn.lessonsCache[lessonId].watchedLastTime = time;
                }
                console.log(`Saved progress: ${time}s`); 
            }
        });
    },

   loadComments: async function (lessonId) {
    const $list = $('#commentList');
    $list.html('<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div> Đang tải bình luận...</div>');
    const token = localStorage.getItem("jwt_token");
    try {
        const res = await $.ajax({
            url: `https://lms-u2jn.onrender.com/api/comment/lesson/${lessonId}`,
            type: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        const allComments = res.data || res;
        
        if (!allComments || allComments.length === 0) {
            $list.html('<div class="text-center py-4 text-muted small">Chưa có bình luận nào. Hãy là người đầu tiên thắc mắc!</div>');
            return;
        }

        const teacherId = this.currentTeacherId; 
        const parents = allComments.filter(c => c.parentId === null);
        
        let html = '';
        parents.forEach(parent => {
            const replies = allComments.filter(c => c.parentId === parent.id);
            html += this.renderCommentItem(parent, replies, teacherId); 
        });

        // Đổ HTML vào danh sách
        $list.html(html);
        
        this.handleCommentAnchor();

    } catch (err) {
        $list.html('<div class="text-center py-3 text-danger small">Không thể tải bình luận.</div>');
    }
},
handleCommentAnchor: function() {
    const hash = window.location.hash;
    if (hash && hash.includes('comment-')) {
        setTimeout(() => {
            const targetElement = document.querySelector(hash);
            if (targetElement) {
                // Cuộn mượt mà
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });

                // Đợi cuộn gần tới (khoảng 300ms) thì bắt đầu nháy vàng
                setTimeout(() => {
                    targetElement.classList.add('highlight-comment-active');
                    
                    // Sau khi hiệu ứng kết thúc, xóa class để có thể kích hoạt lại lần sau
                    setTimeout(() => {
                        targetElement.classList.remove('highlight-comment-active');
                    }, 3500); 
                }, 300);
            }
        }, 800);
    }
},
createActionMenu: function(item, isMe) {
        if (!isMe) return ''; 
        return `
            <div class="dropdown comment-actions-menu ms-2">
                <button class="btn btn-link btn-sm text-muted p-0 border-0" data-bs-toggle="dropdown">
                    <i class="bi bi-three-dots-vertical"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="font-size: 13px;">
                    <li><a class="dropdown-item py-2" href="javascript:void(0)" onclick="Learn.editComment(${item.id})"><i class="bi bi-pencil me-2"></i>Chỉnh sửa</a></li>
                    <li><a class="dropdown-item py-2 text-danger" href="javascript:void(0)" onclick="Learn.deleteComment(${item.id})"><i class="bi bi-trash me-2"></i>Xóa</a></li>
                </ul>
            </div>`;
    },

    createReactionBtn: function(item) {
        const reactionMap = {
            0: { icon: 'bi-hand-thumbs-up', color: 'text-muted', text: 'Thích' },
            1: { icon: 'bi-hand-thumbs-up-fill', color: 'text-primary', text: 'Thích' },
            2: { icon: 'bi-heart-fill', color: 'text-danger', text: 'Yêu thích' },
            3: { icon: 'bi-emoji-laughing-fill', color: 'text-warning', text: 'Haha' },
            4: { icon: 'bi-emoji-surprise-fill', color: 'text-warning', text: 'Wow' },
            5: { icon: 'bi-emoji-frown-fill', color: 'text-warning', text: 'Buồn' },
            6: { icon: 'bi-emoji-angry-fill', color: 'text-danger', text: 'Phẫn nộ' }
        };
        const type = item.reactionType ?? item.ReactionType ?? 0;
        const isLiked = item.isLiked || item.IsLiked || false;
        const currentType = (type === 0 && isLiked) ? 1 : type;
        const config = reactionMap[currentType] || reactionMap[0];

        return `
            <div class="reaction-container">
                <div class="reaction-box shadow-sm">
                    <span class="reaction-icon" onclick="Learn.handleReaction(${item.id}, 1, this)">👍</span>
                    <span class="reaction-icon" onclick="Learn.handleReaction(${item.id}, 2, this)">❤️</span>
                    <span class="reaction-icon" onclick="Learn.handleReaction(${item.id}, 3, this)">😂</span>
                    <span class="reaction-icon" onclick="Learn.handleReaction(${item.id}, 4, this)">😮</span>
                    <span class="reaction-icon" onclick="Learn.handleReaction(${item.id}, 5, this)">😢</span>
                    <span class="reaction-icon" onclick="Learn.handleReaction(${item.id}, 6, this)">😡</span>
                </div>
                <button onclick="Learn.handleReaction(${item.id}, 1, this)" 
                        class="btn btn-link btn-sm text-decoration-none p-0 fw-bold like-btn ${config.color}" 
                        style="font-size: 11px;">
                    <i class="bi ${config.icon}"></i> 
                    <span class="btn-text">${config.text}</span>
                </button>
            </div>`;
    },
   renderSingleReply: function(r, teacherId) {
    const rawUserId = localStorage.getItem("user_id");
    const myId = (rawUserId && rawUserId !== "undefined" && rawUserId !== "null") ? String(rawUserId).trim() : "";
    const instructorId = String(teacherId || this.currentTeacherId || "").trim();

    const isReplyTeacher = r.isTeacher || r.IsTeacher || (String(r.userId).trim() === instructorId);
    const isMe = String(r.userId || "").trim() === myId;
    
    const replyTo = r.replyToUserName || r.ReplyToUserName;
    const mentionHtml = replyTo ? `<span class="text-primary fw-bold me-1">@${replyTo}</span>` : '';
    const timeDisplay = r.createdAt ? this.timeSince(r.createdAt) : 'Vừa xong';

    return `
        <div class="reply-item d-flex mb-3" id="comment-${r.id}">
            <img src="${r.userAvatar || '../assets/img/default-avatar.png'}" 
                 class="avatar-sm me-2 border shadow-sm rounded-circle" 
                 style="width: 32px; height: 32px; object-fit: cover;">
            
            <div class="flex-grow-1">
                <div class="d-flex align-items-start">
                    <div class="bg-light p-2 rounded-3 d-inline-block" style="max-width: 90%;">
                        <div class="d-flex align-items-center gap-1">
                            <span class="fw-bold" style="font-size: 11px;">${r.userFullName}</span>
                            ${isReplyTeacher ? '<span class="badge bg-danger ms-1" style="font-size: 8px;"><i class="bi bi-check-circle-fill"></i> Giảng viên</span>' : ''}
                            ${isMe ? '<small class="text-primary fw-bold" style="font-size: 10px;">(Bạn)</small>' : ''}
                        </div>
                        <p class="mb-0 text-secondary" id="content-${r.id}" style="font-size: 12px; line-height: 1.4;">
                            ${mentionHtml}${r.content}
                        </p>
                    </div>
                    ${this.createActionMenu ? this.createActionMenu(r, isMe) : ''}
                </div>
                
                <div class="mt-1 ms-2 d-flex align-items-center gap-3">
                    <span class="time-text text-muted" style="font-size: 9px;">${timeDisplay}</span>
                    ${this.createReactionBtn ? this.createReactionBtn(r) : ''}
                    <button onclick="Learn.showReplyInput(${r.parentId}, '${r.userFullName}', ${r.userId})" 
                            class="btn-action-text" 
                            style="font-size: 11px; background:none; border:none; font-weight:bold; color:#65676b; cursor:pointer;">
                        Trả lời
                    </button>
                    ${this.renderReactionSummary ? this.renderReactionSummary(r) : ''}
                </div>
            </div>
        </div>`;
},

renderCommentItem: function (comment, teacherId) {
    const rawUserId = localStorage.getItem("user_id");
    const myId = (rawUserId && rawUserId !== "undefined" && rawUserId !== "null") ? String(rawUserId).trim() : "";
    const instructorId = String(teacherId || this.currentTeacherId || "").trim();

    const isPinned = comment.isPinned || comment.IsPinned || false;
    const pinnedClass = isPinned ? 'is-pinned shadow-sm border-warning' : '';
    const pinnedStyle = isPinned ? 'background-color: #fffdf0; padding: 15px; border-radius: 12px; border-left: 4px solid #ffc107;' : '';
    const pinnedHeader = isPinned ? `
        <div class="pinned-label text-warning fw-bold mb-2" style="font-size: 12px;">
            <i class="bi bi-pin-angle-fill"></i> Thông báo từ quản trị viên
        </div>` : '';

    const isParentTeacher = comment.isTeacher || comment.IsTeacher || (String(comment.userId).trim() === instructorId);
    const isParentMe = String(comment.userId || "").trim() === myId;

    // Logic nút xem phản hồi
    const replyCount = comment.replyCount || comment.ReplyCount || 0;
    let viewRepliesBtnHtml = '';
    if (replyCount > 0) {
        viewRepliesBtnHtml = `
            <button class="btn btn-sm text-primary fw-bold mt-2 view-replies-btn" 
                    data-parent-id="${comment.id}" 
                    data-page="1" 
                    data-total="${replyCount}"
                    style="background: none; border: none; padding: 0;">
                <i class="bi bi-caret-down-fill"></i> Xem ${replyCount} phản hồi
            </button>
        `;
    }

    return `
        <div class="comment-item mb-4 border-bottom pb-3 ${pinnedClass}" id="comment-${comment.id}" style="${pinnedStyle}">
            <div class="d-flex">
                <img src="${comment.userAvatar || '../assets/img/default-avatar.png'}" 
                     class="avatar-md me-3 border shadow-sm rounded-circle" 
                     style="width: 40px; height: 40px; object-fit: cover;">
                
                <div class="flex-grow-1">
                    ${pinnedHeader}
                    <div class="d-flex align-items-start">
                        <div class="bg-light p-3 rounded-3 shadow-sm d-inline-block" style="max-width: 92%;">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <span class="fw-bold" style="font-size: 13px;">${comment.userFullName}</span>
                                ${isParentTeacher ? '<span class="badge bg-danger" style="font-size: 9px;"><i class="bi bi-check-circle-fill"></i> Giảng viên</span>' : ''}
                                ${isParentMe ? '<small class="text-primary fw-bold" style="font-size: 10px;">(Bạn)</small>' : ''}
                            </div>
                            <p class="mb-0 text-secondary" id="content-${comment.id}" style="font-size: 13px; line-height: 1.5;">
                                ${comment.content}
                            </p>
                        </div>
                        ${this.createActionMenu ? this.createActionMenu(comment, isParentMe) : ''}
                    </div>

                    <div class="mt-2 ms-2 d-flex align-items-center gap-3">
                        <span class="time-text text-muted" style="font-size: 11px;">
                            ${comment.createdAt ? this.timeSince(comment.createdAt) : 'Vừa xong'}
                        </span>
                        ${this.createReactionBtn ? this.createReactionBtn(comment) : ''}
                        <button onclick="Learn.showReplyInput(${comment.id}, '${comment.userFullName}', ${comment.userId})" 
                                class="btn-action-text" 
                                style="font-size: 12px; background:none; border:none; font-weight:bold; color:#65676b; cursor:pointer;">
                            Trả lời
                        </button>
                        ${this.renderReactionSummary ? this.renderReactionSummary(comment) : ''}
                    </div>

                    <div id="reply-box-${comment.id}" class="mt-2"></div>
                    
                    ${viewRepliesBtnHtml}
                    
                    <div class="replies-list ms-4 mt-2 ps-3 border-start d-none" style="border-width: 2px !important;" id="replies-container-${comment.id}">
                    </div>
                </div>
            </div>
        </div>`;
},

loadParentComments: async function(isLoadMore = false) {
    if (this.commentState.isLoading || !this.commentState.hasMore) return;
    
    this.commentState.isLoading = true;
    if (!isLoadMore) { 
        $('#commentList').html('<div class="text-center p-3 text-muted"><span class="spinner-border spinner-border-sm"></span> Đang tải bình luận...</div>'); 
    } else {
        $('#commentList').append('<div id="loading-more" class="text-center p-2 text-muted"><span class="spinner-border spinner-border-sm"></span> Đang tải thêm...</div>');
    }

    try {
        const res = await $.ajax({
            url: `https://lms-u2jn.onrender.com/api/comment/lesson/${this.commentState.lessonId}/parents?page=${this.commentState.page}&limit=${this.commentState.limit}`,
            type: 'GET',
            headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
        });

        if (res && res.success) {
            const comments = res.result.data;
            const total = res.result.total;
            
            if (!isLoadMore) $('#commentList').empty();
            $('#loading-more').remove(); // Xóa icon loading ở đáy
            if (comments.length === 0 && !isLoadMore) {
                $('#commentList').html('<div class="text-center p-3 text-muted">Chưa có bình luận nào. Hãy là người đầu tiên!</div>');
                return;
            }

            comments.forEach(c => {
                $('#commentList').append(this.renderCommentItem(c, this.currentTeacherId));
            });

            // Check xem còn page tiếp theo không
            if (this.commentState.page * this.commentState.limit >= total) {
                this.commentState.hasMore = false;
            } else {
                this.commentState.page++;
            }
        }
    } catch (err) {
        console.error("Lỗi load comment cha:", err);
        if (!isLoadMore) $('#commentList').html('<div class="text-center p-3 text-danger">Lỗi tải bình luận. Vui lòng thử lại sau.</div>');
    } finally {
        this.commentState.isLoading = false;
        $('#loading-more').remove();
    }
},

loadReplies: async function(parentId, btnElement) {
    const self = this;
    const $btn = $(btnElement);
    const page = parseInt($btn.attr('data-page'));
    const totalReplies = parseInt($btn.attr('data-total'));
    const limit = 10;
    const $container = $(`#replies-container-${parentId}`);

    $btn.html('<span class="spinner-border spinner-border-sm"></span> Đang tải...');
    $btn.prop('disabled', true);

    try {
        const res = await $.ajax({
            // Sử dụng lessonId truyền từ frontend như bạn đã tối ưu
            url: `https://lms-u2jn.onrender.com/api/comment/${parentId}/replies?lessonId=${self.commentState.lessonId}&page=${page}&limit=${limit}`,
            type: 'GET',
            headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
        });

        if (res && res.success) {
            const replies = res.result.data;
            
            $container.removeClass('d-none');
            
            replies.forEach(r => {
                $container.append(self.renderSingleReply(r, self.currentTeacherId));
            });

            const loadedCount = (page - 1) * limit + replies.length;
            if (loadedCount >= totalReplies) {
                $btn.hide(); // Hết phản hồi thì ẩn nút
            } else {
                $btn.attr('data-page', page + 1);
                $btn.html(`<i class="bi bi-arrow-return-right"></i> Xem thêm phản hồi (${totalReplies - loadedCount})`);
            }
        }
    } catch (err) {
        console.error("Lỗi load replies:", err);
        $btn.html('<i class="bi bi-exclamation-triangle"></i> Lỗi! Thử lại');
    } finally {
        $btn.prop('disabled', false);
    }
},
postComment: async function(parentId = null) {
    const selector = parentId ? `#replyInput-${parentId}` : '#commentInput';
    const $input = $(selector);
    const content = $input.val().trim();
    if (!content) return;

    const $btn = parentId 
        ? $(`#reply-box-${parentId} button`).last() 
        : $('.comment-section button').first();

    const dto = {
        content: content,
        lessonId: parseInt(this.currentLessonId || this.commentState.lessonId),
        courseId: parseInt(new URLSearchParams(window.location.search).get("id")),
        parentId: parentId,
        replyToUserId: $input.data('reply-to-id') || null,
        replyToUserName: $input.data('reply-to-name') || null
    };

    const userInfo = AuthHelper.getUserInfo();
    const userAvatar = userInfo?.avatar || "../assets/img/default-avatar.png";
    const userName = userInfo?.fullName || userInfo?.username || "Học viên";
    const teacherId = this.currentTeacherId;

    // Tạo một ID tạm thời để định vị phần tử ảo trên DOM
    const tempId = "temp_cmt_" + Date.now();

    const mockCommentData = {
        id: tempId,
        content: dto.content,
        parentId: dto.parentId,
        replyToUserName: dto.replyToUserName,
        createdAt: new Date().toISOString(),
        userId: userInfo?.id || 0,
        userFullName: userName,
        userAvatar: userAvatar,
        isPinned: false,
        totalReactions: 0,
        topReactionTypes: [],
        reactionStats: []
    };

    // --- BƯỚC 2: CẬP NHẬT GIAO DIỆN TỨC THÌ (OPTIMISTIC UI) ---
    if (parentId) {
        // Render ảo cho REPLY CON
        const replyHtml = this.renderSingleReply(mockCommentData, teacherId);
        const $repliesContainer = $(`#replies-container-${parentId}`);
        $repliesContainer.removeClass('d-none').prepend(replyHtml);
        $(`#reply-box-${parentId}`).hide(); 
    } else {
        // Render ảo cho COMMENT CHA
        const commentHtml = this.renderCommentItem(mockCommentData, teacherId);
        const $list = $('#commentList');

        if ($list.find('.comment-item').length === 0) {
            $list.empty();
        }

        const $lastPinned = $list.find('.comment-item.is-pinned').last();
        if ($lastPinned.length > 0) {
            $lastPinned.after(commentHtml);
        } else {
            $list.prepend(commentHtml);
        }
    }

    // 📍 ĐÃ BỎ HOÀN TOÀN OPACITY MỜ ẢO -> Hiện rõ nét xịn sò luôn từ đầu!
    const $mockElement = $(`#comment-${tempId}`);

    // Xóa trống ô nhập liệu lập tức
    $input.val('');

    try {
        // --- BƯỚC 3: GỌI API CHẠY NGẦM VỚI TIMEOUT ---
        const res = await $.ajax({
            url: 'https://lms-u2jn.onrender.com/api/comment',
            type: 'POST',
            contentType: 'application/json',
            timeout: 5000, // Quá 5 giây tự hủy đẩy xuống catch để xóa comment ảo
            headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") },
            data: JSON.stringify(dto)
        });

        // --- BƯỚC 4: THÀNH CÔNG -> ĐỒNG BỘ THUỘC TÍNH NGẦM ĐA ĐIỂM (KHÔNG NHÁY UI) ---
        if (res && res.success) {
            const newComment = res.data;

            // 1. Cập nhật lại ID của thẻ bọc cha
            $mockElement.attr('id', `comment-${newComment.id}`);
            
            // 2. 📍 SỬA ĐÚNG SELECTOR: Đồng bộ ID thẻ text nội dung comment (Fix triệt để lỗi Edit/Reply đơ)
            $mockElement.find(`#content-${tempId}`).attr('id', `content-${newComment.id}`);

            // 3. Nếu là comment cha, sửa luôn ID của cái khối reply-box và replies-container chờ sẵn bên dưới nó
            $mockElement.find(`#reply-box-${tempId}`).attr('id', `reply-box-${newComment.id}`);
            $mockElement.find(`#replies-container-${tempId}`).attr('id', `replies-container-${newComment.id}`);
            $mockElement.find(`[data-parent-id="${tempId}"]`).attr('data-parent-id', newComment.id);

            // 4. Quét sạch tất cả các hàm onclick cũ bám theo ID tạm, đổi hàng loạt sang ID thật của DB
            $mockElement.find(`[onclick*="${tempId}"]`).each(function() {
                const oldOnclick = $(this).attr('onclick');
                const newOnclick = oldOnclick.replace(new RegExp(tempId, 'g'), newComment.id);
                $(this).attr('onclick', newOnclick);
            });

            if (parentId) {
                $(`#reply-box-${parentId}`).empty().show();
            }
            
            // Toàn bộ DOM giữ nguyên vị trí, không có một tí hiệu ứng giật hay tải lại nào!
        } else {
            throw new Error("API trả về thất bại!");
        }
    } catch (err) {
        // --- BƯỚC 5: ROLLBACK NẾU MẠNG LỖI HOẶC TIMEOUT ---
        console.error("Post Error:", err);
        if (typeof Toast !== 'undefined') {
            Toast.fire({ icon: 'error', title: "Không thể gửi bình luận!" });
        }

        $mockElement.remove();
        $input.val(content);

        if (parentId) {
            $(`#reply-box-${parentId}`).show();
        }
    }
},
initCommentEvents: function() {
    const self = this;
    
    // Gắn sự kiện click xem phản hồi
    $(document).off('click', '.view-replies-btn').on('click', '.view-replies-btn', function(e) {
        if(e) e.preventDefault();
        const parentId = $(this).attr('data-parent-id');
        self.loadReplies(parentId, this);
    });

    // BẮT TRỰC TIẾP SỰ KIỆN CUỘN CỦA #commentList
    $('#commentList').off('scroll').on('scroll', function() {
        
        // 1. KHÓA: Nếu đang tải dở (isLoading) hoặc hết sạch bình luận (hasMore = false) thì bỏ qua
        if (self.commentState.isLoading || !self.commentState.hasMore) {
            return; 
        }

        // 2. PRE-FETCH: Tăng từ 50 lên 150 để tải trước khi user chạm đáy thật sự
        if ($(this).scrollTop() + $(this).innerHeight() >= this.scrollHeight - 150) {
            
            // 3. UI LOADING: Nhét ngay cục loading xoay xoay vào đáy list để user nhìn thấy
            if ($('#loading-more').length === 0) {
                $('#commentList').append(`
                    <div id="loading-more" class="text-center py-3 text-muted" style="font-size: 13px;">
                        <span class="spinner-border spinner-border-sm me-2"></span>Đang tải thêm...
                    </div>
                `);
                // Ép cuộn xuống 1 tí xíu cho user thấy cái cục loading
                $(this).scrollTop(this.scrollHeight);
            }

            // Gọi API
            self.loadParentComments(true); 
        }
    });
},
    showReplyInput: function(rootId, userName, replyToUserId) {
        const $replyBox = $(`#reply-box-${rootId}`);
        if ($replyBox.html() !== "") { $replyBox.empty(); return; }
        $('[id^="reply-box-"]').empty();

        const html = `
            <div class="ms-4 mt-2 mb-3">
                <textarea id="replyInput-${rootId}" 
                          data-reply-to-id="${replyToUserId}"
                          data-reply-to-name="${userName}"
                          class="form-control form-control-sm bg-light mb-2" 
                          rows="2" placeholder="Trả lời ${userName}..."></textarea>
                <div class="text-end">
                    <button onclick="$('#reply-box-${rootId}').empty()" class="btn btn-sm btn-link text-muted">Hủy</button>
                    <button onclick="Learn.postComment(${rootId})" class="btn btn-sm btn-primary px-3 rounded-pill">Gửi</button>
                </div>
            </div>`;
        $replyBox.html(html);
        $(`#replyInput-${rootId}`).focus();
    },

cancelEdit: function(id) {
    const $contentElement = $(`#content-${id}`);
    const oldHtml = $contentElement.data('old-html');
    if (oldHtml) {
        $contentElement.html(oldHtml);
    }
},
editComment: function(id) {
    const $contentElement = $(`#content-${id}`);
    if ($contentElement.length === 0) return;

    // 📍 1. Bốc cái thẻ span chứa tên người được reply (nếu có) và lưu tạm vào data()
    const $replySpan = $contentElement.find('span').first();
    if ($replySpan.length > 0) {
        $contentElement.data('reply-user-html', $replySpan[0].outerHTML);
    } else {
        $contentElement.data('reply-user-html', ''); // Trống nếu là comment cha
    }

    // 2. Lấy nội dung thô loại bỏ span
    let currentText = $contentElement
        .clone()            
        .find('span')       
        .remove()           
        .end()              
        .text()             
        .trim();            

    // 3. Tạo giao diện sửa
    const editHtml = `
        <div class="edit-wrapper mt-2 animate__animated animate__fadeIn">
            <textarea id="editInput-${id}" class="form-control form-control-sm mb-2 shadow-sm" 
                      rows="3" style="font-size: 13px; border-radius: 8px; line-height: 1.5;"></textarea>
            <div class="d-flex justify-content-end gap-2">
                <button class="btn btn-sm btn-light border text-muted" onclick="Learn.cancelEdit(${id})">Hủy</button>
                <button class="btn btn-sm btn-primary px-3 fw-bold shadow-sm" onclick="Learn.saveEdit(${id})">Cập nhật</button>
            </div>
        </div>
    `;

    $contentElement.html(editHtml);

    const $input = $(`#editInput-${id}`);
    $input.val(currentText); 
    $input.focus();

    const el = $input[0];
    if (el.setSelectionRange) {
        const len = el.value.length;
        el.setSelectionRange(len, len);
    }
},

saveEdit: async function(id) {
    const newContent = $(`#editInput-${id}`).val().trim();
    if (!newContent) return; 

    try {
        const token = localStorage.getItem("jwt_token");
        await $.ajax({
            url: `https://lms-u2jn.onrender.com/api/comment/update/${id}`,
            type: 'PUT',
            contentType: 'application/json',
            headers: { 'Authorization': `Bearer ${token}` },
            data: JSON.stringify(newContent)
        });

        const $contentElement = $(`#content-${id}`);
        
        // 📍 4. Lấy lại cái thẻ span @user đã cất giấu từ lúc nãy
        const savedReplyHtml = $contentElement.data('reply-user-html') || '';
        
        // Cập nhật giao diện: Gắn kèm thẻ @user trở lại đầu chuỗi nội dung mới
        $contentElement.html(savedReplyHtml + " " + newContent); 

        // Thêm nhãn (Đã chỉnh sửa) vào phần thời gian
        const $timeText = $(`#comment-${id}`).find('.time-text').first();
        if (!$timeText.find('.edited-mark').length) {
            $timeText.append(' <span class="text-muted edited-mark" style="font-size: 9px;">(Đã chỉnh sửa)</span>');
        }

        Toast.fire({ icon: 'success', title: 'Đã cập nhật xong!' });

    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Lỗi rồi bác ơi!' });
    }
},
deleteComment: async function(id) {
    // 1. Hiện bảng hỏi xác nhận
    Swal.fire({
        title: 'Xóa bình luận?',
        text: "Bạn sẽ không thể khôi phục lại bình luận này!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Đồng ý!',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        // 2. Nếu người dùng bấm "Đúng, xóa nó!"
        if (result.isConfirmed) {
            try {
                // Hiện loading cho nút bấm để người dùng khỏi bấm nhiều lần
                Swal.showLoading();

                const token = localStorage.getItem("jwt_token");
                const res = await $.ajax({
                    url: `https://lms-u2jn.onrender.com/api/comment/delete/${id}`,
                    type: 'PUT', // Giữ nguyên PUT vì bác đang làm Soft Delete (Cập nhật IsDeleted)
                    contentType: 'application/json',
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                // 3. Nếu API trả về thành công (Giả sử trả về { success: true })
                // Bác kiểm tra lại response của API bác nhé
                if (res) { 
                    // Hiệu ứng mờ dần và biến mất cho comment
                    const $commentEl = $(`#comment-${id}`);
                    $commentEl.fadeOut(500, function() {
                        $(this).remove(); // Xóa hẳn khỏi HTML sau khi mờ xong
                    });

                  Toast.fire({ icon: 'success', title: 'Đã xóa bình luận thành công!' });
                }
            } catch (error) {
                console.error("Lỗi xóa:", error);
                Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ hoặc bạn không có quyền xóa.', 'error');
            }
        }
    });
},

    // Hàm phụ trợ tính thời gian (Vừa xong, 5 phút trước...)
    timeSince: function (date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " năm trước";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " tháng trước";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " ngày trước";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " giờ trước";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " phút trước";
        return "Vừa xong";
    },
    checkResumeProgress: async function(courseId) {
    const token = localStorage.getItem("jwt_token");
    try {
        // 1. Gọi đến API Resume bác vừa viết ở Backend
        const res = await $.ajax({
            url: `${this.config.apiUrl}/resume/${courseId}`, // Đường dẫn API Resume
            type: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.success && res.resumeLessonId) {
            console.log("Hệ thống: Tự động đưa bác về bài học ID:", res.resumeLessonId);
            
            // 2. CHỐT HẠ: Gọi hàm changeVideo để nạp mọi thứ (Video, Progress, Comment)
            this.changeVideo(res.resumeLessonId);
        } else {
            // Nếu không có resume (lỗi hoặc khóa học rỗng), phát bài đầu tiên của chapter 1
            console.log("Hệ thống: Không tìm thấy tiến độ cũ, phát bài đầu tiên.");
            const firstId = $('.lesson-item').first().attr('id')?.replace('lesson-', '');
            if(firstId) this.changeVideo(parseInt(firstId));
        }
    } catch (err) {
        console.error("Lỗi khi check resume:", err);
    }
},
// Giả sử toàn bộ code nằm trong object Learn = { ... }
// Bác thêm hàm này vào cùng cấp với renderCommentItem
renderReactionSummary: function (item) {
    const total = item.totalReactions || item.TotalReactions || 0;
    const commentId = item.id || item.Id;
    
    if (total === 0) return '';

    const reactionMap = {
        1: { text: 'Thích', emoji: '👍' },
        2: { text: 'Yêu thích', emoji: '❤️' },
        3: { text: 'Haha', emoji: '😂' },
        4: { text: 'Wow', emoji: '😮' },
        5: { text: 'Buồn', emoji: '😢' },
        6: { text: 'Phẫn nộ', emoji: '😡' }
    };

    const stats = item.reactionStats || item.ReactionStats || [];
    const statsHtml = stats.map(s => {
        const type = s.type !== undefined ? s.type : s.Type;
        const count = s.count !== undefined ? s.count : s.Count;
        const config = reactionMap[type];
        return (config && count > 0) ? `<div class="stat-item"><span>${config.emoji}</span> <b>${count}</b></div>` : '';
    }).join('');

    const topTypes = item.topReactionTypes || item.TopReactionTypes || [];
    const iconsHtml = topTypes.map(type => {
        const config = reactionMap[type];
        return config ? `<span class="summary-icon-item">${config.emoji}</span>` : '';
    }).join('');

    return `
        <div class="reaction-summary-pos">
            <div class="reaction-summary-wrapper" 
                 onclick="Learn.showReactionDetails(${commentId})" 
                 style="cursor: pointer;">
                <div class="reaction-icons-stack">${iconsHtml}</div>
                <span class="reaction-total-count">${total}</span>
                <div class="reaction-custom-tooltip">${statsHtml}</div>
            </div>
        </div>`;
},
handleReaction: async function(commentId, type, btn) {
    const $this = $(btn);
    const $btnLike = $this.closest('.reaction-container').find('.like-btn');
    const $actionRow = $this.closest('.d-flex');
    
    if ($btnLike.length === 0 || $btnLike.hasClass('is-loading')) return;

    const token = localStorage.getItem("jwt_token");
    if (!token) {
        Toast.fire({ icon: 'warning', title: 'Bạn cần đăng nhập!' });
        return;
    }

    const reactionConfig = {
        0: { icon: 'bi-hand-thumbs-up', color: 'text-muted', text: 'Thích' },
        1: { icon: 'bi-hand-thumbs-up-fill', color: 'text-primary', text: 'Thích' },
        2: { icon: 'bi-heart-fill', color: 'text-danger', text: 'Yêu thích' },
        3: { icon: 'bi-emoji-laughing-fill', color: 'text-warning', text: 'Haha' },
        4: { icon: 'bi-emoji-surprise-fill', color: 'text-warning', text: 'Wow' },
        5: { icon: 'bi-emoji-frown-fill', color: 'text-warning', text: 'Buồn' },
        6: { icon: 'bi-emoji-angry-fill', color: 'text-danger', text: 'Phẫn nộ' }
    };

    // --- BƯỚC 1: LƯU TRẠNG THÁI CŨ ĐỂ DỰ PHÒNG ---
    const oldBtnHtml = $btnLike.html();
    const oldBtnClass = $btnLike.attr('class');
    const $oldSummary = $actionRow.find('> .reaction-summary-pos');
    const oldSummaryHtml = $oldSummary.length ? $oldSummary[0].outerHTML : '';

    // 📍 XÁC ĐỊNH REACTION CŨ USER ĐANG CHỌN DỰA TRÊN CLASS MÀU CỦA NÚT BẤM
    let oldType = 0;
    if ($btnLike.hasClass('text-primary')) oldType = 1;     // Like
    else if ($btnLike.hasClass('text-danger')) {
        if ($btnLike.find('i').hasClass('bi-heart-fill')) oldType = 2; // Tym
        else oldType = 6; // Phẫn nộ
    }
    else if ($btnLike.hasClass('text-warning')) {
        if ($btnLike.find('i').hasClass('bi-emoji-laughing-fill')) oldType = 3;
        else if ($btnLike.find('i').hasClass('bi-emoji-surprise-fill')) oldType = 4;
        else oldType = 5;
    }

    // --- BƯỚC 2: CẬP NHẬT GIAO DIỆN TỨC THÌ (OPTIMISTIC) ---
    const targetType = parseInt(type);
    const config = reactionConfig[targetType];

    // 2.1 Cập nhật diện mạo nút bấm ngay lập tức
    $btnLike.removeClass('text-primary text-danger text-warning text-muted').addClass(config.color);
    $btnLike.find('i').attr('class', `bi ${config.icon}`);
    if ($btnLike.find('.btn-text').length) $btnLike.find('.btn-text').text(config.text);
    $btnLike.addClass('is-loading');

    // 2.2 Xử lý toán học dải số đếm Summary chuẩn chỉnh không phụ thuộc API
    let currentTotal = parseInt($oldSummary.find('.reaction-total-count').text()) || 0;
    
    // Tính toán tổng số lượt tương tác ảo:
    let optimisticTotal = currentTotal;
    if (oldType === 0 && targetType > 0) {
        optimisticTotal += 1; // Chưa tương tác gì -> Bấm chọn 1 loại => Tăng 1
    } else if (oldType > 0 && targetType === 0) {
        optimisticTotal = Math.max(0, optimisticTotal - 1); // Đang tương tác -> Bấm bỏ chọn => Giảm 1
    } // Nếu đổi từ reaction này sang loại khác (oldType > 0 && targetType > 0) thì tổng giữ nguyên không đổi

    if (optimisticTotal === 0) {
        $oldSummary.remove();
    } else {
        // 📍 Trích xuất dữ liệu cũ trong Tooltip và tính toán CỘNG / TRỪ logic
        let optimisticStats = [];
        let foundCurrentTypeInStats = false;

        if ($oldSummary.length > 0) {
            $oldSummary.find('.reaction-custom-tooltip .stat-item').each(function() {
                const txt = $(this).text().trim();
                const emoji = txt.substring(0, 2).trim();
                let count = parseInt(txt.replace(/[^0-9]/g, '')) || 0;
                
                let typeId = 0;
                if (emoji === '👍') typeId = 1;
                else if (emoji === '❤️') typeId = 2;
                else if (emoji === '😂') typeId = 3;
                else if (emoji === '😮') typeId = 4;
                else if (emoji === '😢') typeId = 5;
                else if (emoji === '😡') typeId = 6;

                // 1. Trừ bớt số lượng của cái cũ nếu đổi loại
                if (typeId === oldType && oldType > 0) {
                    count = Math.max(0, count - 1);
                }

                // 2. Cộng thêm số lượng cho cái mới bấm
                if (typeId === targetType) {
                    foundCurrentTypeInStats = true;
                    if (targetType > 0) {
                        count += 1;
                    }
                }

                if (count > 0) {
                    optimisticStats.push({ type: typeId, count: count });
                }
            });
        }

        // Nếu loại reaction mới bấm chưa từng tồn tại trong tooltip cũ, nạp mới với giá trị khởi tạo = 1
        if (targetType > 0 && !foundCurrentTypeInStats) {
            optimisticStats.push({ type: targetType, count: 1 });
        }

        // 📍 Cập nhật lại dải icon Top emoji ảo dựa trên mảng stats mới tính toán xong
        let optimisticTopTypes = optimisticStats.map(s => s.type);

        // Vẽ giao diện ảo hoàn chỉnh lên màn hình
        const optimisticHtml = this.renderReactionSummary({
            id: commentId,
            totalReactions: optimisticTotal,
            topReactionTypes: optimisticTopTypes,
            reactionStats: optimisticStats
        });
        
        if ($oldSummary.length > 0) {
            $oldSummary.replaceWith(optimisticHtml);
        } else {
            $actionRow.find('.btn-action-text').last().after(optimisticHtml);
        }
    }

    try {
        // --- BƯỚC 3: GỌI API NGẦM + TIMEOUT 5 GIÂY ---
        const res = await $.ajax({
            url: `https://lms-u2jn.onrender.com/api/comment/handleLike/${commentId}`,
            type: 'POST',
            contentType: 'application/json',
            timeout: 5000, 
            headers: { 'Authorization': `Bearer ${token}` },
            data: JSON.stringify({ type: targetType }) 
        });

        // --- BƯỚC 4: ĐỒNG BỘ DATA KHỚP ĐÉT TỪ SERVER KHI CÓ KẾT QUẢ ---
        const result = res.data || res;
        const updatedHtml = this.renderReactionSummary({
            id: commentId,
            totalReactions: result.totalReactions || result.TotalReactions || 0,
            topReactionTypes: result.topReactionTypes || result.TopReactionTypes || [],
            reactionStats: result.reactionStats || result.ReactionStats || []
        });

        const $currentSummary = $actionRow.find('> .reaction-summary-pos');
        if ($currentSummary.length > 0) {
            $currentSummary.replaceWith(updatedHtml);
        } else if (updatedHtml !== '') {
            $actionRow.find('.btn-action-text').last().after(updatedHtml);
        }

    } catch (error) {
        // --- BƯỚC 5: ROLLBACK TRẢ LẠI GIAO DIỆN CŨ NẾU MẠNG LỖI HOẶC TIMEOUT ---
        console.error("Lỗi API hoặc Timeout, đang rollback về ban đầu:", error);
        $btnLike.attr('class', oldBtnClass).html(oldBtnHtml);
        
        if (oldSummaryHtml) {
            const $now = $actionRow.find('> .reaction-summary-pos');
            if ($now.length) $now.replaceWith(oldSummaryHtml);
            else $actionRow.find('.btn-action-text').last().after(oldSummaryHtml);
        } else {
            $actionRow.find('> .reaction-summary-pos').remove();
        }
    } finally {
        $btnLike.removeClass('is-loading');
    }
},
showReactionDetails: async function(commentId) {
    const $modal = $('#reactionModal');
    const $body = $('#reactionModalBody');
    $modal.modal('show');
    $body.html('<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>');

    try {
        const res = await $.get(`https://lms-u2jn.onrender.com/api/comment/getReactions/${commentId}`);
        this.currentCommentReactions = res.data || res;
        this.renderReactionTabs(this.currentCommentReactions);
        this.renderUserListInModal(0); // Mặc định hiện tất cả
    } catch (error) {
        $body.html('<p class="text-center p-3 text-danger">Lỗi tải dữ liệu!</p>');
    }
},

renderUserListInModal: function (filterType) {
    const $body = $('#reactionModalBody');
    const emojiMap = { 1: '👍', 2: '❤️', 3: '😂', 4: '😮', 5: '😢', 6: '😡' };
    const filteredUsers = filterType == 0 
        ? this.currentCommentReactions 
        : this.currentCommentReactions.filter(u => (u.reactionType || u.ReactionType) == filterType);

    if (filteredUsers.length === 0) {
        $body.html('<div class="text-center p-4 text-muted">Không có ai.</div>');
        return;
    }

    const html = filteredUsers.map(u => {
        const userId = u.userId || 0; 

        return `
            <div class="user-item d-flex align-items-center p-3" 
                 onclick="window.location.href='/user/profile.html?id=${userId}'" 
                 style="cursor: pointer; transition: background 0.2s;" 
                 onmouseover="this.style.backgroundColor='#f8f9fa'" 
                 onmouseout="this.style.backgroundColor='transparent'">
                 
                <img src="${u.userAvatar || '../assets/img/default-avatar.png'}" 
                     class="rounded-circle border" 
                     style="width: 42px; height: 42px; object-fit: cover;">
                     
                <div class="ms-3 flex-grow-1">
                    <div class="fw-bold text-dark hover-underline">${u.userFullName}</div>
                </div>
                
                <span style="font-size: 20px;">${emojiMap[u.reactionType || u.ReactionType]}</span>
            </div>`;
    }).join('');
    
    $body.html(html);
},
renderReactionTabs : function(users) {
    const emojiMap = { 0: 'Tất cả', 1: '👍', 2: '❤️', 3: '😂', 4: '😮', 5: '😢', 6: '😡' };
    const $tabs = $('#reactionTabs');
    
    // Đếm số lượng từng loại hiện có
    const counts = { 0: users.length };
    users.forEach(u => {
        const type = u.reactionType || u.ReactionType;
        counts[type] = (counts[type] || 0) + 1;
    });

    let tabsHtml = '';
    Object.keys(counts).forEach(type => {
        const activeClass = type == 0 ? 'active border-primary border-bottom border-3' : '';
        tabsHtml += `
            <li class="nav-item" role="presentation">
                <button class="nav-link border-0 bg-transparent py-2 px-3 fw-bold text-dark ${activeClass}" 
                        onclick="Learn.filterReactions(this, ${type})" 
                        style="font-size: 13px;">
                    ${type == 0 ? 'Tất cả' : emojiMap[type]} ${counts[type]}
                </button>
            </li>`;
    });
    $tabs.html(tabsHtml);
},
filterReactions : function(btn, type) {
    $('#reactionTabs .nav-link').removeClass('active border-primary border-bottom border-3');
    $(btn).addClass('active border-primary border-bottom border-3');
    this.renderUserListInModal(type);
},

}

$(document).ready(function() {
    // 1. "Vét" tham số từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    if (tokenFromUrl) {
        console.log("🎯 Đang tự thiết lập Session từ URL...");

        const userId = urlParams.get('userId');
        const username = decodeURIComponent(urlParams.get('username') || "");
        const role = urlParams.get('role');
        const avatar = decodeURIComponent(urlParams.get('avatar') || "");
        // Lưu Token
        localStorage.setItem("jwt_token", tokenFromUrl);
        
        // Lưu User ID
        localStorage.setItem("user_id", userId); 
        const userInfo = {
            id: userId,
            username: username,
            role: role,
            avatar: avatar
        };
        localStorage.setItem("user_info", JSON.stringify(userInfo));
        const cleanUrl = window.location.href.split('&token=')[0].split('?token=')[0];
        window.history.replaceState({}, document.title, cleanUrl);
        
        console.log("✅ Đã lưu xong jwt_token, user_id và user_info!");
    }

    // 4. Giờ mới cho Learn chạy
    // Learn.init() lúc này gọi API sẽ lấy được jwt_token từ tủ ra dùng luôn.
    Learn.init();
});
let lastTimeReceived = 0;
let checkDeadlyInterval = null;
window.addEventListener("message", function(event) {
    if (event.origin !== "https://iframe.mediadelivery.net") return;

    let data = event.data;
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) {}
    }

    const eventName = data.event || data.eventName || data; 

    // 1. KHI VIDEO TẢI XONG (READY) -> BẮT BUỘC ĐĂNG KÝ SỰ KIỆN
    if (eventName === 'ready') {
        console.log("✅ Video Bunny đã sẵn sàng. Tiến hành đăng ký sự kiện...");
        
        // Tìm thẻ iframe của Bunny trên trang (bạn kiểm tra xem selector này đã đúng với dự án chưa nhé)
        const iframe = document.querySelector('iframe[src*="iframe.mediadelivery.net"]');
        
        if (iframe) {
            // Yêu cầu Bunny thông báo tiến độ (timeupdate)
            iframe.contentWindow.postMessage(JSON.stringify({
                context: "player.js",
                method: "addEventListener",
                value: "timeupdate"
            }), "*");

            // Yêu cầu Bunny thông báo kết thúc (ended)
            iframe.contentWindow.postMessage(JSON.stringify({
                context: "player.js",
                method: "addEventListener",
                value: "ended"
            }), "*");
            
            console.log("✅ Đã gửi yêu cầu lắng nghe 'timeupdate' và 'ended' thành công!");
        } else {
            console.warn("⚠️ Không tìm thấy thẻ iframe của Bunny để đăng ký sự kiện!");
        }
    }

    // 2. SỰ KIỆN CẬP NHẬT THỜI GIAN (LƯU TIẾN ĐỘ)
    if (eventName === 'timeupdate' || eventName === 'player:timeupdate') {
        const currentTime = data.data && data.data.seconds ? data.data.seconds : (data.currentTime || (data.value && data.value.currentTime));
        
        if (currentTime !== undefined) {
            window.lastBunnyTime = Math.floor(currentTime);
            // Bật heartbeat nếu chưa chạy
            if (!Learn.isHeartbeatRunning) { 
                Learn.startHeartbeat(currentLessonId, 'bunny');
            }
        }
    }

    // 3. SỰ KIỆN KẾT THÚC VIDEO (CHUYỂN BÀI)
    if (eventName === 'ended' || eventName === 'player:ended') {
        console.log("🎉 Đã bắt được sự kiện kết thúc Bunny!");
        
        Learn.stopHeartbeat();
        Learn.sendProgressToBackend(currentLessonId, 100); 
        Learn.markAsCompleted(currentLessonId);

        // Chuyển bài
        if (typeof Learn.nextLesson === 'function') {
            Learn.nextLesson();
        } else if (typeof Learn.playNext === 'function') {
            Learn.playNext();
        } else {
            const nextBtn = $('.btn-next-lesson, #nextLessonBtn');
            if (nextBtn.length > 0) nextBtn.click();
        }
    }
});