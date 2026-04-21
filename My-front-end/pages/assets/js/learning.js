var player;
var isApiReady = false;
let heartbeatInterval; // Biến giữ nhịp tim
let currentLessonId = 0; 
let = currentCommentReactions=[];
var bunnyPlayer = null;
isCommentLoaded: false,
function onYouTubeIframeAPIReady() {
    console.log("YouTube API: Đã sẵn sàng");
    isApiReady = true;
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
    if (event.data == YT.PlayerState.ENDED) {
        console.log("Video kết thúc, chốt hạ reset về 0!");
        Learn.stopHeartbeat(); 
        
        if (currentLessonId) {
            // Lưu tiến độ về 0s
            Learn.sendProgressToBackend(currentLessonId, 0); 
            
            // CHỈ GỌI HÀM NÀY - Trong hàm này đã có logic chuyển bài 10 (bài tiếp theo) rồi
            Learn.markAsCompleted(currentLessonId);
        }
    }
    else if (event.data == YT.PlayerState.PLAYING) {
        if (currentLessonId) {
            console.log("ok");
            Learn.startHeartbeat(currentLessonId); 
        }
    }
    else {
        Learn.stopHeartbeat();
    }
}


var Learn = {
    config: {
        apiUrl: "http://vinh369-001-site1.site4future.com/api/Course" 
    },
    lessonsCache: {},
    init: function() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    const lessonIdFromUrl = urlParams.get('lessonId');

    if (courseId) {
        Learn.loadCourseContent(courseId);
    }
    
    // --- ĐĂNG KÝ SỰ KIỆN TAB TRƯỚC ---
    $(document).on('shown.bs.tab', '#comment-tab', function (e) {
        console.log("Sự kiện tab nổ!");
        debugger
        const activeLessonId = $('.lesson-item.active').attr('data-id') || lessonIdFromUrl;
        
        if (activeLessonId && !Learn.isCommentLoaded) {
            Learn.loadComments(activeLessonId);
        }
    });

    // --- TRƯỜNG HỢP: ĐIỀU HƯỚNG TỪ THÔNG BÁO ---
    const hash = window.location.hash;
    if (hash && hash.includes('comment-')) {
        const triggerEl = document.querySelector('#comment-tab'); // Dùng luôn ID cho chắc
        if (triggerEl) {
            // Chỉ cần ra lệnh show Tab, cái sự kiện 'shown.bs.tab' ở trên sẽ tự lo việc loadComments
            bootstrap.Tab.getOrCreateInstance(triggerEl).show();
        }
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
            data.chapters.forEach(chapter => {
                chapter.lessons.forEach(lesson => {
                    Learn.lessonsCache[lesson.id] = lesson;
                });
            });
            Learn.renderChapters(data.chapters);
            console.log("Đang kiểm tra tiến độ để học tiếp...");
            this.checkResumeProgress(courseId); 
        }
    } catch (error) { 
        console.error("Lỗi khi tải nội dung khóa học:", error); 
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

    // 1. CHỐT HẠ BÀI CŨ (Bọc trong try catch để tránh treo hàm)
    if (currentLessonId !== 0 && currentLessonId !== newLessonId) {
        try {
            let lastTime = 0;
            const oldLesson = Learn.lessonsCache[currentLessonId];

            if (oldLesson.provider === "Bunny") {
                // Nếu Bunny dùng cách "Tự đếm" của anh em mình thì lấy biến global
                lastTime = window.currentBunnySeconds || 0; 
            } 
            else if (player && typeof player.getCurrentTime === 'function') {
                lastTime = Math.floor(player.getCurrentTime() || 0);
            }

            // Lưu nhanh vào Backend
            if (lastTime >= 20) {
                Learn.sendProgressToBackend(currentLessonId, lastTime);
            }
        } catch (err) {
            console.error("Lỗi khi chốt bài cũ, vẫn tiếp tục mở bài mới:", err);
        }
    }

    // 2. CẬP NHẬT ID MỚI NGAY LẬP TỨC
    currentLessonId = newLessonId; // Gán luôn ở đây cho chắc ăn!

    // 3. CHUẨN BỊ MỞ BÀI MỚI
    const newLesson = Learn.lessonsCache[newLessonId];
    if (!newLesson) return;

    Learn.stopHeartbeat();
    const startTime = newLesson.watchedLastTime || 0;

    // 4. LOAD VIDEO
    if (newLesson.provider === "Bunny") {
        this.renderBunny(newLesson.videoId.trim(), startTime);
    } else {
        this.renderYouTube(newLesson.videoId.trim(), startTime);
    }

    // 5. CẬP NHẬT UI
    $('#currentLessonTitle').text(newLesson.title);
    $('.lesson-item').removeClass('active');
    $(`#lesson-${newLessonId}`).addClass('active');
},
renderYouTube: function(videoId, startTime) {
    
    // Ẩn/Hiện Iframe hoặc xử lý logic switch player nếu cần
    if (player && typeof player.loadVideoById === 'function') {
        player.loadVideoById({ videoId: videoId, startSeconds: startTime });
    } else {
        player = new YT.Player('mainVideoFrame', {
            videoId: videoId,
            playerVars: { 'autoplay': 1, 'start': startTime, 'enablejsapi': 1 },
            events: { 'onStateChange': onPlayerStateChange }
        });
    }
},
renderBunny: function(videoId, startTime) {
    const LIBRARY_ID = '635360'; 
    const bunnyUrl = `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?autoplay=true&start=${startTime}`;
    
    // 1. Render Iframe
    const container = document.getElementById('mainVideoFrame').parentElement;
    container.style.position = "relative"; // Đảm bảo container có relative để overlay đè đúng chỗ
    container.innerHTML = `<iframe id="bunnyVideoPlayer" src="${bunnyUrl}" style="border: none; position: absolute; top: 0; height: 100%; width: 100%;" allow="autoplay; fullscreen"></iframe>`;

    // 2. Tạo biến đếm và trạng thái
    window.currentBunnySeconds = parseInt(startTime) || 0;
    window.isWatching = true; 

    // 3. Tạo Overlay "thông minh"
    const overlay = document.createElement('div');
    overlay.style = "position:absolute; top:0; left:0; width:100%; height:85%; z-index:10; cursor:pointer; background: rgba(0,0,0,0);";
    container.appendChild(overlay);

    overlay.onclick = function() {
        const iframe = document.getElementById('bunnyVideoPlayer');
        window.isWatching = !window.isWatching;

        if (window.isWatching) {
            console.log("🔥 Play -> Chạy lưu 20s");
            // Gửi lệnh Play vào video
            iframe.contentWindow.postMessage({ method: 'play' }, "*");
            Learn.startHeartbeat(currentLessonId, 'bunny');
        } else {
            console.log("🛑 Pause -> Dừng lưu");
            // Gửi lệnh Pause vào video
            iframe.contentWindow.postMessage({ method: 'pause' }, "*");
            Learn.stopHeartbeat();
        }
    };

    // Tự động chạy heartbeat lần đầu vì có autoplay=true
    Learn.startHeartbeat(currentLessonId, 'bunny');
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
        // 1. TÌM BÀI TIẾP THEO (Giữ nguyên logic của bác)
        const allLessons = $('.lesson-item'); 
        const currentIndex = allLessons.index($(`#lesson-${lessonId}`));
        let nextLessonId = null;
        if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
            const nextElement = allLessons.eq(currentIndex + 1);
            nextLessonId = parseInt(nextElement.attr('id').replace('lesson-', ''));
        }

        // 2. GỌI API BÁO HOÀN THÀNH
        const response = await $.ajax({
            url: `${Learn.config.apiUrl}/complete-lesson/${lessonId}`,
            type: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        debugger
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
    // Mỗi nhịp 20s, ta tự cộng dồn vào
    window.currentBunnySeconds += 20; 
    
    let currentTime = window.currentBunnySeconds;
    console.log(`[Lưu Bunny - Manual] Đang lưu: ${currentTime}s`);
    
    // Gọi API lưu của bác
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
    postComment: async function(parentId = null) {
    // 1. CHỖ HỚ 1: Phải chọn đúng ô nhập (Ô chính hoặc ô Reply)
    const selector = parentId ? `#replyInput-${parentId}` : '#commentInput';
    const content = $(selector).val().trim();
    
    if (!content) {
        Toast.fire({ icon: 'warning', title: 'Nội dung không được để trống!' });
        return;
    }

    const token = localStorage.getItem("jwt_token");
    if (!token) {
        Toast.fire({ icon: 'warning', title: 'Bạn cần đăng nhập!' });
        return;
    }

    // Đảm bảo lấy đúng currentLessonId (dùng this nếu nó nằm trong object Learn)
    const lessonId = this.currentLessonId || currentLessonId;

    const dto = {
        content: content,
        lessonId: parseInt(lessonId),
        parentId: parentId
    };

    try {
        // 2. CHỖ HỚ 2: Phải gán biến 'const res' thì bên dưới mới có 'res.message'
        const res = await $.ajax({
            url: 'http://vinh369-001-site1.site4future.com/api/comment',
            type: 'POST',
            contentType: 'application/json',
            headers: {
                "Authorization": "Bearer " + token
            },
            data: JSON.stringify(dto)
        });

        // Hiện thông báo từ Backend trả về
        Toast.fire({
            icon: 'success',
            title: res.message 
        });

        // 3. CHỖ HỚ 3: Xử lý UI sau khi xong
        $(selector).val(''); // Xóa nội dung ô vừa nhập
        if (parentId) {
            $(`#reply-box-${parentId}`).empty(); // Đóng ô reply nếu là trả lời
        }
        
        // Nạp lại danh sách bình luận
        this.loadComments(lessonId);

    } catch (err) {
        // Thay alert bằng Toast cho chuyên nghiệp
        const errorMsg = err.responseJSON?.message || "Cần đăng nhập để bình luận!";
        Toast.fire({
            icon: 'error',
            title: errorMsg
        });
    }
},
   loadComments: async function (lessonId) {
    const $list = $('#commentList');
    $list.html('<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div> Đang tải bình luận...</div>');
    const token = localStorage.getItem("jwt_token");
    try {
        const res = await $.ajax({
            url: `http://vinh369-001-site1.site4future.com/api/comment/lesson/${lessonId}`,
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
        this.isCommentLoaded = true;
        // --- QUAN TRỌNG: Gọi hàm cuộn và bôi vàng sau khi list đã xuất hiện trên DOM ---
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
renderCommentItem: function (comment, replies, teacherId) {
    const rawUserId = localStorage.getItem("user_id");
    const myId = (rawUserId && rawUserId !== "undefined" && rawUserId !== "null") ? String(rawUserId).trim() : "";
    const instructorId = String(teacherId || "").trim();

    // 1. Cấu hình Reaction Map
    const reactionMap = {
        0: { icon: 'bi-hand-thumbs-up', color: 'text-muted', text: 'Thích' },
        1: { icon: 'bi-hand-thumbs-up-fill', color: 'text-primary', text: 'Thích' },
        2: { icon: 'bi-heart-fill', color: 'text-danger', text: 'Yêu thích' },
        3: { icon: 'bi-emoji-laughing-fill', color: 'text-warning', text: 'Haha' },
        4: { icon: 'bi-emoji-surprise-fill', color: 'text-warning', text: 'Wow' },
        5: { icon: 'bi-emoji-frown-fill', color: 'text-warning', text: 'Buồn' },
        6: { icon: 'bi-emoji-angry-fill', color: 'text-danger', text: 'Phẫn nộ' }
    };

    // 2. Hàm tạo Menu 3 chấm (Chỉnh sửa/Xóa)
    const createActionMenu = (item, isMe) => {
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
    };

    // 3. Hàm tạo cụm Reaction
    const createReactionBtn = (item) => {
        const type = item.reactionType !== undefined ? item.reactionType : 
                     (item.ReactionType !== undefined ? item.ReactionType : 0);
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
    };

    // 4. Render danh sách Reply (Comment con)
    let repliesHtml = (replies || []).map(r => {
        const isMe = String(r.userId || "").trim() === myId;
        const isInst = String(r.userId || "").trim() === instructorId;
        const replyTo = r.replyToUserName || r.ReplyToUserName;
        const mentionHtml = replyTo ? `<span class="text-primary fw-bold me-1">@${replyTo}</span>` : '';

        return `
            <div class="reply-item d-flex mb-3" id="comment-${r.id}">
                <img src="${r.userAvatar || '../assets/img/default-avatar.png'}" class="avatar-sm me-2 border shadow-sm rounded-circle">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-start">
                        <div class="bg-light p-2 rounded-3 d-inline-block" style="max-width: 90%;">
                            <div class="d-flex align-items-center gap-1">
                                <span class="fw-bold" style="font-size: 11px;">${r.userFullName}</span>
                                ${isInst ? '<span class="badge bg-danger ms-1" style="font-size: 8px;">Giảng viên</span>' : ''}
                                ${isMe ? '<small class="text-primary fw-bold" style="font-size: 10px;">(Bạn)</small>' : ''}
                            </div>
                            <p class="mb-0 text-secondary" id="content-${r.id}" style="font-size: 12px;">
                                ${mentionHtml}${r.content}
                            </p>
                        </div>
                        ${createActionMenu(r, isMe)}
                    </div>
                    <div class="mt-1 ms-2 d-flex align-items-center gap-3">
                        <span class="time-text" style="font-size: 9px; color:#8a8d91;">${this.timeSince(r.createdAt)}</span>
                        ${createReactionBtn(r)}
                        <button onclick="Learn.showReplyInput(${comment.id}, '${r.userFullName}')" class="btn-action-text" style="font-size: 11px; background:none; border:none; font-weight:bold; color:#65676b;">Trả lời</button>
                        ${this.renderReactionSummary ? this.renderReactionSummary(r) : ''} 
                    </div>
                </div>
            </div>`;
    }).join('');

    // 5. Logic xử lý Ghim (Pin)
    const isPinned = comment.isPinned || comment.IsPinned || false;
    const pinnedClass = isPinned ? 'is-pinned shadow-sm border-warning' : '';
    const pinnedHeader = isPinned ? 
        `<div class="pinned-label text-warning fw-bold mb-1" style="font-size: 11px;">
            <i class="bi bi-pin-angle-fill"></i> Thông báo từ quản trị viên
         </div>` : '';

    const isParentMe = String(comment.userId || "").trim() === myId;
    const isParentInst = String(comment.userId || "").trim() === instructorId;

    // 6. Render Comment Cha
    return `
        <div class="comment-item mb-4 border-bottom pb-3 ${pinnedClass}" id="comment-${comment.id}" 
             style="${isPinned ? 'background-color: #fffdf0; padding: 10px; border-radius: 8px;' : ''}">
            <div class="d-flex">
                <img src="${comment.userAvatar || '../assets/img/default-avatar.png'}" class="avatar-md me-2 border shadow-sm rounded-circle">
                <div class="flex-grow-1">
                    
                    ${pinnedHeader}

                    <div class="d-flex align-items-start">
                        <div class="bg-light p-3 rounded-3 shadow-sm d-inline-block" style="max-width: 90%;">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <span class="fw-bold" style="font-size: 13px;">${comment.userFullName}</span>
                                ${isParentInst ? '<span class="badge bg-danger" style="font-size: 9px;">Giảng viên</span>' : ''}
                                ${isParentMe ? '<small class="text-primary fw-bold" style="font-size: 10px;">(Bạn)</small>' : ''}
                                ${isPinned ? '<i class="bi bi-pin-angle-fill text-warning" title="Đã ghim"></i>' : ''}
                            </div>
                            <p class="mb-0 text-secondary" id="content-${comment.id}" style="font-size: 13px;">${comment.content}</p>
                        </div>
                        ${createActionMenu(comment, isParentMe)}
                    </div>
                    
                    <div class="mt-2 ms-2 d-flex align-items-center gap-3">
                        <span class="time-text" style="font-size: 11px; color:#8a8d91;">${this.timeSince(comment.createdAt)}</span>
                        ${createReactionBtn(comment)}
                        <button onclick="Learn.showReplyInput(${comment.id}, '${comment.userFullName}')" class="btn-action-text" style="font-size: 12px; background:none; border:none; font-weight:bold; color:#65676b;">Trả lời</button>
                        ${this.renderReactionSummary ? this.renderReactionSummary(comment) : ''}
                    </div>
                    
                    <div id="reply-box-${comment.id}" class="mt-2"></div>
                    <div class="replies-list ms-4 mt-2 ps-3 border-start">${repliesHtml}</div>
                </div>
            </div>
        </div>`;
},
editComment: function(id) {
    const $contentElement = $(`#content-${id}`);
    
    // 1. Kiểm tra xem có tìm thấy phần tử không (Để debug nếu cần)
    if ($contentElement.length === 0) {
        console.error(`Không tìm thấy thẻ #content-${id}`);
        return;
    }

    // 2. Lưu HTML cũ để đề phòng nhấn "Hủy"
    $contentElement.data('old-html', $contentElement.html());

    // 3. LẤY NỘI DUNG THÔ (Cách mới: Chắc cú hơn)
    // Mình clone ra một bản tạm, xóa cái thẻ span (@user) đi rồi mới bốc text
    let currentText = $contentElement
        .clone()            // Tạo bản sao
        .find('span')       // Tìm thằng @user
        .remove()           // Xóa nó đi khỏi bản sao
        .end()              // Quay lại bản sao ban đầu
        .text()             // Lấy text còn lại
        .trim();            // Dọn dẹp khoảng trắng

    // 4. Tạo giao diện sửa (Để trống textarea để tí nữa mình dùng .val() đổ vào cho chuẩn)
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

    // 5. ĐỔ DỮ LIỆU VÀO VÀ FOCUS
    const $input = $(`#editInput-${id}`);
    $input.val(currentText); // Dùng .val() đổ dữ liệu là cách an toàn nhất, chấp mọi loại ký tự đặc biệt
    $input.focus();

    // Đưa con trỏ xuống cuối dòng cho người dùng sửa luôn
    const el = $input[0];
    if (el.setSelectionRange) {
        const len = el.value.length;
        el.setSelectionRange(len, len);
    }
},
cancelEdit: function(id) {
    const $contentElement = $(`#content-${id}`);
    const oldHtml = $contentElement.data('old-html');
    if (oldHtml) {
        $contentElement.html(oldHtml);
    }
},
saveEdit: async function(id) {
    const newContent = $(`#editInput-${id}`).val().trim();
    if (!newContent) return; // Chặn trống

    try {
        const token = localStorage.getItem("jwt_token");
        await $.ajax({
            url: `http://vinh369-001-site1.site4future.com/api/comment/update/${id}`,
            type: 'PUT',
            contentType: 'application/json',
            headers: { 'Authorization': `Bearer ${token}` },
            data: JSON.stringify(newContent)
        });

        // --- BẮT ĐẦU CẬP NHẬT GIAO DIỆN ---
        const $contentElement = $(`#content-${id}`);
        $contentElement.html(newContent); // Thay nội dung mới (mất @user như bác muốn)

        // DÁN ĐOẠN CODE CỦA BÁC VÀO ĐÂY
        const $timeText = $(`#comment-${id}`).find('.time-text').first();
        
        // Kiểm tra xem đã có chữ "(Đã chỉnh sửa)" chưa để tránh bị lặp
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
                    url: `http://vinh369-001-site1.site4future.com/api/comment/delete/${id}`,
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
showReplyInput: function(parentId, userName) {
    const $replyBox = $(`#reply-box-${parentId}`);
    if ($replyBox.html() !== "") {
        $replyBox.empty();
        return;
    }
    $('[id^="reply-box-"]').empty();

    const html = `
        <div class="ms-4 mt-2 mb-3 animate__animated animate__fadeIn">
            <textarea id="replyInput-${parentId}" class="form-control form-control-sm bg-light mb-2 shadow-sm" 
                      rows="2" placeholder="Trả lời ${userName}..."></textarea>
            <div class="text-end">
                <button onclick="$('#reply-box-${parentId}').empty()" class="btn btn-sm btn-link text-muted text-decoration-none">Hủy</button>
                <button onclick="Learn.postComment(${parentId})" class="btn btn-sm btn-primary px-3 rounded-pill fw-bold">Gửi</button>
            </div>
        </div>
    `;
    $replyBox.html(html);
    $(`#replyInput-${parentId}`).focus();
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
    // 1. Kiểm tra dữ liệu: Phải có tổng > 0 mới vẽ
    const total = item.totalReactions || item.TotalReactions || 0;
    const commentId = item.id || item.Id; // Lấy ID để truyền vào hàm click
    
    if (total === 0) return '';

    const reactionMap = {
        1: { text: 'Thích', emoji: '👍' },
        2: { text: 'Yêu thích', emoji: '❤️' },
        3: { text: 'Haha', emoji: '😂' },
        4: { text: 'Wow', emoji: '😮' },
        5: { text: 'Buồn', emoji: '😢' },
        6: { text: 'Phẫn nộ', emoji: '😡' }
    };

    // 2. Tạo nội dung cho Tooltip khi Hover
    const stats = item.reactionStats || item.ReactionStats || [];
    const statsHtml = stats.map(s => {
        const type = s.type !== undefined ? s.type : s.Type;
        const count = s.count !== undefined ? s.count : s.Count;
        const config = reactionMap[type];
        return (config && count > 0) ? `<div class="stat-item"><span>${config.emoji}</span> <b>${count}</b></div>` : '';
    }).join('');

    // 3. Lấy Top 3 icon đại diện
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
                
                <div class="reaction-custom-tooltip">
                    ${statsHtml}
                </div>
            </div>
        </div>`;
},
handleReaction: async function(commentId, type, btn) {
    const $this = $(btn);
    // 1. Tìm hàng chứa các nút tương tác hiện tại (d-flex)
    const $actionRow = $this.closest('.d-flex'); 
    // 2. Tìm nút Like chính trong cụm đó
    const $btnLike = $this.closest('.reaction-container').find('.like-btn');
    
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

    try {
        // Hiệu ứng loading cho nút
        $btnLike.addClass('is-loading').css('opacity', '0.6');

        const res = await $.ajax({
            url: `http://vinh369-001-site1.site4future.com/api/comment/handleLike/${commentId}`,
            type: 'POST',
            contentType: 'application/json',
            headers: { 'Authorization': `Bearer ${token}` },
            data: JSON.stringify({ type: parseInt(type) }) 
        });

        const result = res.data || res;
        
        // --- 1. CẬP NHẬT TRẠNG THÁI NÚT BẤM ---
        const rType = (result.reactionType !== undefined) ? result.reactionType : result.ReactionType;
        const config = reactionConfig[rType || 0];

        $btnLike.removeClass('text-primary text-danger text-warning text-muted').addClass(config.color);
        $btnLike.find('i').attr('class', `bi ${config.icon}`);
        if ($btnLike.find('.btn-text').length) {
            $btnLike.find('.btn-text').text(config.text);
        }

        // --- 2. CẬP NHẬT DẢI TOTAL (CHỈ CHO COMMENT NÀY) ---
        const updatedData = {
            id: commentId,
            totalReactions: result.totalReactions || result.TotalReactions || 0,
            topReactionTypes: result.topReactionTypes || result.TopReactionTypes || [],
            reactionStats: result.reactionStats || result.ReactionStats || []
        };

        // CHỈ TÌM thẻ .reaction-summary-pos là con trực tiếp của hàng nút bấm này
       const $summaryContainer = $actionRow.find('> .reaction-summary-pos');

        // Gọi hàm render để lấy HTML mới
        const newSummaryHtml = this.renderReactionSummary(updatedData);

        if ($summaryContainer.length > 0) {
            // Nếu có rồi thì thay thế
            $summaryContainer.replaceWith(newSummaryHtml);
        } else if (newSummaryHtml !== '') {
            // Nếu chưa có (like đầu tiên) thì chèn sau nút trả lời
            $actionRow.find('.btn-action-text').after(newSummaryHtml);
        }

    } catch (error) {
        console.error("Lỗi API Reaction:", error);
        Toast.fire({ icon: 'error', title: 'Có lỗi xảy ra, thử lại sau!' });
    } finally {
        // Mở khóa nút
        $btnLike.removeClass('is-loading').css('opacity', '1');
    }
},
// Bác dán hàm này vào cùng cấp với showReactionDetails
renderUserListInModal: function (filterType) {
   const $body = $('#reactionModalBody');
    const emojiMap = { 1: '👍', 2: '❤️', 3: '😂', 4: '😮', 5: '😢', 6: '😡' };

    // Lọc dữ liệu: 0 là lấy hết, còn lại lấy đúng Type
    const filteredUsers = filterType == 0 
        ? this.currentCommentReactions 
        : this.currentCommentReactions.filter(u => (u.reactionType || u.ReactionType) == filterType);

    if (filteredUsers.length === 0) {
        $body.html('<div class="text-center p-4 text-muted">Không có ai.</div>');
        return;
    }

    const html = filteredUsers.map(u => {
        const avatar = u.userAvatar || u.UserAvatar || '../assets/img/default-avatar.png';
        const name = u.userFullName || u.UserFullName;
        const type = u.reactionType !== undefined ? u.reactionType : u.ReactionType;
        const profileUrl = `/Profile/Index/${u.userId || u.UserId}`;

        return `
            <div class="user-item d-flex align-items-center p-3 border-bottom-0">
                <a href="${profileUrl}" target="_blank" class="d-flex align-items-center text-decoration-none text-dark flex-grow-1">
                    <div class="position-relative">
                        <img src="${avatar}" class="rounded-circle border" style="width: 42px; height: 42px; object-fit: cover;">
                        <span class="position-absolute bottom-0 end-0 bg-white rounded-circle shadow-sm d-flex align-items-center justify-content-center" 
                              style="width: 18px; height: 18px; font-size: 10px; border: 1px solid #eee;">
                            ${emojiMap[type]}
                        </span>
                    </div>
                    <div class="ms-3">
                        <div class="fw-bold" style="font-size: 14px;">${name}</div>
                        <small class="text-muted" style="font-size: 11px;">Xem trang cá nhân</small>
                    </div>
                </a>
            </div>`;
    }).join('');

    $body.html(html);
},

// Nhắc lại hàm showReactionDetails để bác thấy cách nó gọi nhau:
showReactionDetails: async function(commentId) {
    const $modal = $('#reactionModal');
        const $tabs = $('#reactionTabs');
        const $body = $('#reactionModalBody');

        $modal.modal('show');
        $tabs.html(''); // Xóa tabs cũ
        $body.html('<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>');

        try {
            const res = await $.get(`http://vinh369-001-site1.site4future.com/api/comment/getReactions/${commentId}`);
            this.currentCommentReactions = res.data || res;
            this.renderReactionTabs(this.currentCommentReactions);
            // Mặc định hiện tất cả (Type = 0)
            this.renderUserListInModal(0);
        } catch (error) {
            $body.html('<p class="text-center p-3 text-danger">Lỗi tải dữ liệu!</p>');
        }
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

    let data;
    try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch (e) { return; }

    // Bunny luôn bắn timeupdate khi ĐANG CHẠY
    if (data.event === 'player:timeupdate' || data.event === 'timeupdate') {
        window.lastBunnyTime = Math.floor(data.currentTime || data.value.currentTime);
        lastTimeReceived = Date.now(); // Cập nhật mốc thời gian cuối cùng nhận được tin nhắn
        
        // Nếu đang có heartbeat mà video chạy lại, đảm bảo nó bật
        if (!heartbeatInterval) {
            console.log("🔥 Nhận tín hiệu thời gian -> Bật Heartbeat");
            Learn.startHeartbeat(currentLessonId, 'bunny');
        }
    }

    // Sự kiện kết thúc
    if (data.event === 'player:ended' || data.event === 'ended') {
        Learn.stopHeartbeat();
        Learn.sendProgressToBackend(currentLessonId, 0); 
        Learn.markAsCompleted(currentLessonId);
    }
});