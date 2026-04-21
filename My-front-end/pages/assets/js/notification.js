window.NotificationApp = {
    connection: null,
    currentSkip: 0,
    limit:10,
    // 1. Khởi tạo SignalR
    init: function () {
        if (this.connection) return;
        const token = localStorage.getItem("jwt_token") || localStorage.getItem("token");
        
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("http://vinh369-001-site1.site4future.com/notificationHub", {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        this.connection.on("ReceiveNotification", (data) => {
            console.log("🔔 SignalR nhận tin:", data);
            this.renderNotification(data);
        });

        this.connection.start().catch(err => console.error("SignalR Error:", err));
    },

    // 2. Xử lý khi có thông báo MỚI (từ SignalR)
    renderNotification: function (data) {
        // Cập nhật số chuông ngay lập tức (Tăng thêm 1)
        this.updateBadgeCount(1, true); // true = cộng dồn

        // Vẽ HTML và chèn lên ĐẦU danh sách
        const $list = $('#notifList');
        $('#notif-empty-placeholder').remove();
        
        data.isRead = false; // Mới nhận chắc chắn là chưa đọc
        const html = this.generateNotifHtml(data);
        $list.prepend(html);

        // Nổ hiệu ứng âm thanh và Toast
        const avatar = data.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.senderName)}&background=random&color=fff`;
        // Gọi hàm với đầy đủ tham số
        this.playEffects(data.message, avatar, data.redirectUrl, data.type, data.reactionType, data.createdAt);
    },

fetchNotifications: function (isLoadMore = false) {
    const token = localStorage.getItem("jwt_token");
    const $list = $('#notifList');
    const $btnLoadMore = $('#btnLoadMore');
    const $btnText = $btnLoadMore.find('button');

    if (!isLoadMore) {
        this.currentSkip = 0; 
        $list.html('<div class="p-4 text-center loader"><div class="spinner-border spinner-border-sm text-primary"></div></div>');
        $btnLoadMore.hide();
    } else {
        $btnText.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Đang tải...');
    }

    $.ajax({
        url: `http://vinh369-001-site1.site4future.com/api/Notification/GetNotif?skip=${this.currentSkip}&limit=${this.limit}`,
        type: 'GET',
        headers: { "Authorization": "Bearer " + token },
        success: (res) => {
            const notifications = res.data || res;
            
            // Xóa loader/danh sách cũ CHỈ khi load lần đầu
            if (!isLoadMore) $list.empty();

            if (!notifications || notifications.length === 0) {
                if (!isLoadMore) {
                    $list.html('<div class="p-4 text-center text-muted">Chưa có thông báo nào</div>');
                } else {
                    $btnText.text('Đã hiện tất cả').prop('disabled', true);
                    setTimeout(() => $btnLoadMore.fadeOut(), 2000);
                }
                return;
            }

            // --- BƯỚC QUAN TRỌNG: CHỈ APPEND MỘT LẦN ---
            let htmlBuffer = "";
            notifications.forEach(item => {
                htmlBuffer += this.generateNotifHtml(item);
            });
            $list.append(htmlBuffer);

            // Tăng skip để lần sau lấy đúng trang tiếp theo (Ví dụ: 0 -> 10 -> 20)
            this.currentSkip += this.limit;

            // Xử lý hiển thị nút
            if (notifications.length < this.limit) {
                $btnLoadMore.hide(); 
            } else {
                $btnLoadMore.show();
                $btnText.prop('disabled', false).text('Xem thêm thông báo cũ hơn');
            }

            // Nếu là load thêm, ép dropdown luôn mở và cuộn xuống
            if (isLoadMore) {
                // Chặn Bootstrap tự đóng (chiêu này ép dropdown đứng im)
                $('#notifDropdown').dropdown('show'); 
                
                // Cuộn xuống để thấy item mới
                $list.animate({
                    scrollTop: $list.prop("scrollHeight")
                }, 500);
            }
        },
        error: () => {
            $btnText.prop('disabled', false).text('Thử lại');
            if (!isLoadMore) $list.html('<div class="p-3 text-center text-danger">Lỗi kết nối</div>');
        }
    });
},
    // 4. Lấy SỐ LƯỢNG chưa đọc (Khi load trang)
    getUnreadCount: function() {
        const token = localStorage.getItem("jwt_token");
        if (!token) return;

        $.get("http://vinh369-001-site1.site4future.com/api/Notification/unread-count", (res) => {
            this.updateBadgeCount(res.count || 0, false);
        });
    },
markAllRead: async function() {
    const token = localStorage.getItem("jwt_token");
    if (!token) return;

    try {
        const response = await fetch(`http://vinh369-001-site1.site4future.com/api/notification/mark-all`, {
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            // 1. Đổi màu nền các item trong dropdown
            $('.unread-item').css({
                'background-color': '#fff',
                'border-left': 'none'
            });

            // 2. Ẩn các chấm đỏ nhỏ trong từng item
            $('.notif-unread-dot').fadeOut();

            // 3. CẬP NHẬT SỐ LƯỢNG TRÊN CHUÔNG (Sửa ở đây)
            const $badge = $('#notifCount'); // Dùng đúng ID #notifCount
            $badge.text('0');               // Đưa số về 0
            $badge.addClass('d-none');      // Thêm class d-none để ẩn badge đỏ

            console.log("Đã đánh dấu đọc tất cả!");
        }
    } catch (e) {
        console.error("Lỗi khi đánh dấu đọc tất cả:", e);
    }
},


    // 5. Hàm dùng chung để tạo HTML (Giúp đồng bộ giao diện)
generateNotifHtml: function(data) {
    const avatar = data.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.senderName || 'U')}&background=random&color=fff`;
        const typeIconMap = {
        1: "💬", // CommentReply: Luôn hiện icon chat
    };
    debugger
    // 2. Map cho loại cảm xúc (ReactionTypeEnum)
    const reactionEmojiMap = {
        1: "👍", // Like
        2: "❤️", // Love
        3: "😆", // Haha
        4: "😮", // Wow
        5: "😢", // Sad
        6: "😡"  // Angry
};const emoji = (data.type === 2) 
    ? (reactionEmojiMap[data.reactionType] || "👍") 
    : (typeIconMap[data.type] || "🔔");
    const isRead = data.isRead === true;
    const friendlyTime = this.timeAgo(data.createdAt);

    return `
        <div class="unread-item d-flex align-items-center" 
             onclick="NotificationApp.handleRedirect(${data.id}, '${data.redirectUrl || '#'}')" 
             style="cursor:pointer; padding: 12px 15px; border-bottom: 1px solid #eee; 
             ${isRead ? 'background-color: #fff;' : 'background-color: #f0f7ff; border-left: 4px solid #0866ff;'}">
            
            <div class="notif-avatar-wrapper">
                <img src="${avatar}">
                <div class="reaction-badge-overlay">${emoji}</div>
            </div>
            
            <div class="ms-3 flex-grow-1">
                <div style="color: ${isRead ? '#65676b' : '#050505'}; font-size: 14px; font-weight: ${isRead ? '400' : '500'};">
                    ${data.message}
                </div>
                <div style="color: #0866ff; font-size: 11px; font-weight: 600;">
                    ${friendlyTime}
                </div>
            </div>
            ${!isRead ? '<div class="notif-unread-dot"></div>' : ''}
        </div>`;
},
handleRedirect: async function(notifId, url) {
    const token = localStorage.getItem("jwt_token");
    
    // Đánh dấu đã đọc
    try {
        fetch(`http://vinh369-001-site1.site4future.com/api/notification/mark-read/${notifId}`, {
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) { }

    if (url && url !== '#') {
        const parts = url.split('#');
        const targetBaseUrl = parts[0];
        const targetHash = parts[1];

        if (window.location.href.split('#')[0].includes(targetBaseUrl)) {
            // Cập nhật hash lên thanh địa chỉ
            window.location.hash = targetHash;
            
            // Chỉ làm 1 việc duy nhất: Mở Tab. 
            // Khi tab mở, nó sẽ tự gọi loadComments -> loadComments sẽ tự gọi handleCommentAnchor
            const commentTab = document.querySelector('#comment-tab');
            if (commentTab) {
                bootstrap.Tab.getOrCreateInstance(commentTab).show();
            }
        } else {
            window.location.href = url;
        }
    }
},
    // 6. Hàm cập nhật số trên Badge
    updateBadgeCount: function(val, isRelative) {
        const $badge = $('#notifCount');
        let current = isRelative ? (parseInt($badge.text()) || 0) : 0;
        let final = isRelative ? (current + val) : val;

        if (final > 0) {
            $badge.text(final > 99 ? '99+' : final).removeClass('d-none');
        } else {
            $badge.addClass('d-none').text('0');
        }
    },

    playEffects: function(msg, avatar, url, nType, rType, time) {
    // 1. Phát âm thanh
    new Audio('../assets/sounds/notification.mp3').play().catch(() => {});

    if (typeof Swal === "undefined") return;

    // 2. Map Emoji (Dùng số int cho đồng bộ với Backend)
    const reactionMap = {
        1: "👍", 2: "❤️", 3: "😆", 
        4: "😮", 5: "😢", 6: "😡"
    };

    let emoji = "🔔";
    // Ép kiểu về số để so sánh chính xác
    const typeInt = parseInt(nType);
    const reactInt = rType ? parseInt(rType) : null;

    if (typeInt === 1) {
        emoji = "💬"; // Reply
    } else if (typeInt === 2) {
        emoji = reactionMap[reactInt] || "👍"; // Like/Reaction
    }

    // 3. Hiển thị Toast bằng SweetAlert2
    Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        padding: '0.5rem',
        html: `
            <div class="d-flex align-items-center text-start" style="cursor:pointer;">
                <div style="position: relative; width: 42px; height: 42px; flex-shrink: 0;">
                    <img src="${avatar || '../assets/img/default-avatar.png'}" class="rounded-circle border" style="width: 100%; height: 100%; object-fit: cover;">
                    <div style="position: absolute; bottom: -2px; right: -2px; width: 20px; height: 20px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; border: 1.5px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.2);">
                        ${emoji}
                    </div>
                </div>
                <div class="ms-3">
                    <div style="font-size: 13px; color: #1c1e21; font-weight: 500; line-height: 1.2;">${msg}</div>
                    <div style="font-size: 11px; color: #0866ff; margin-top: 2px; font-weight: 600;">${NotificationApp.timeAgo(time)}</div>
                </div>
            </div>`,
        didOpen: (toast) => {
            toast.addEventListener('click', () => {
                if (url && url !== '#') window.location.href = url;
            });
        }
    });
},
    timeAgo: function(dateParam) {
    if (!dateParam) return 'Vừa xong';

    const date = new Date(dateParam);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    // Nếu quá 7 ngày thì hiện ngày tháng cụ thể
    return date.toLocaleDateString('vi-VN'); 
},
};
// Trong hàm render HTML hoặc file HTML của bác, hãy đổi sang listener này:
// Đặt đoạn này trong file JS của bác, ngoài hàm NotificationApp
// Dùng .off() để xóa các listener cũ trước khi gán mới
$(document).off('click', '#btnLoadMore button').on('click', '#btnLoadMore button', function (e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Thêm kiểm tra: Nếu nút đang disable (đang load) thì không chạy tiếp
    if ($(this).prop('disabled')) return;

    console.log("Đang gọi load thêm...");
    NotificationApp.fetchNotifications(true);
});