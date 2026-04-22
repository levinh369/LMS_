var Lesson = {
    categories: [],
    sortableInstance: null,
    existingCount : 0,
    currentChapterId : 0,
    currentCourseId : 0,
    isChapterNameLoaded: false,
    config: {
        apiUrl: "https://lms-u2jn.onrender.com/api/Lesson"
    },
    
    // Hàm khởi tạo - Gọi khi trang load xong
    init: function () {
        Lesson.loadData();
        Lesson.registerEvents();  
    },

    // Đăng ký tất cả sự kiện ở đây (Thay vì viết onclick trong HTML)
    registerEvents: function () {
        $(document).on('input', '.txtVideoLink', function() {
            const val = $(this).val();
            const id = Lesson.extractVideoId(val);
            const parent = $(this).closest('.modal-body');
            parent.find('.txtVideoId').val(id);
            parent.find('.lblVideoId').text(id);
        });

        // Tab Hàng loạt: Dán link tự bóc ID ngay trong dòng
        $(document).on('input', '.lesson-video', function() {
            // 1. Lấy ID
            const id = Lesson.extractVideoId($(this).val());
            
            // 2. Tìm thằng preview nằm cùng trong "video-group" và đổ text vào
            // Cấu trúc: Lên cha (video-group) -> Tìm con (video-preview)
            $(this).closest('.video-group').find('.video-preview').text(id || "---");
        });
        $('#frmLessonBulk').on('submit', function(e) {
        e.preventDefault(); // CHẶN load lại trang
        Lesson.saveBulk();  // GỌI hàm này để xử lý API
});
    $(document).on('change', '#editIsActive', function() {
        let isActive = $(this).is(':checked'); // Kiểm tra xem đang bật hay tắt
        let lbl = $('#lblEditStatus');

        if (isActive) {
            lbl.text("Đang hoạt động").addClass("text-success").removeClass("text-danger");
        } else {
            lbl.text("Vô hiệu").addClass("text-danger").removeClass("text-success");
        }
    });
    $('#previewModal').on('hidden.bs.modal', function () {
        $('#videoIframe').attr('src', '');
    });
$(document).on('input', '.lesson-video', async function () {
    const row = $(this).closest('tr'); // Hoặc .closest('.bulk-row') tùy class của Vinh
    const inputVal = $(this).val().trim();
    
    // 1. Phân tích link để lấy ID và Provider
    const videoData = Lesson.extractVideoInfo(inputVal);
    const videoId = videoData.id;
    const provider = videoData.provider;

    if (videoId) {
        // 2. Lưu thông tin vào "data" của dòng để hàm saveBulk bốc ra
        row.data('video-id', videoId);
        row.data('provider', provider);
        
        // 3. Hiển thị Preview cho Vinh dễ nhìn
        const badgeClass = provider === 'YouTube' ? 'bg-danger' : 'bg-primary';
        row.find('.video-id-preview span').html(
            `<small class="badge ${badgeClass}">${provider}</small> <code>${videoId}</code>`
        );
        
        // 4. Gọi API Backend để lấy thời lượng tự động
        try {
            // Xác định đúng "cửa" API dựa trên Provider
            const endpoint = (provider === "YouTube") ? "get-duration" : "get-duration-bunny";
            
            const res = await fetch(`${Lesson.config.apiUrl}/${endpoint}/${videoId}`);
            
            if (res.ok) {
                const data = await res.json();
                
                // Cập nhật số giây vào ô Input thời lượng của dòng đó
                // Lưu ý: Vinh nên tìm theo class trong row để không bị nhảy lung tung
                row.find('.lesson-duration').val(data.seconds); 
                
                // Cập nhật luôn vào bộ nhớ data của dòng
                row.data('duration', data.seconds); 
                
                console.log(`✅ Lấy thời lượng ${provider} thành công: ${data.seconds}s`);
            } else {
                console.error(`❌ API trả lỗi khi lấy thời lượng ${provider}`);
            }
        } catch (e) { 
            console.error("❌ Lỗi kết nối API:", e); 
        }
    } else {
        // Nếu xóa trắng ô input thì reset luôn thông tin
        row.find('.video-id-preview span').text('Chưa có ID');
        row.data('video-id', null);
        row.data('provider', null);
    }
});
$(document).on('input', '#editVideoId', function () {
    const videoValue = $(this).val();
    // Lấy provider hiện tại đang chọn trong select (YouTube/Bunny/Vimeo)
    const provider = $('#editProvider').val(); 
    
    // Gọi hàm render với đầy đủ thông tin
    Lesson.renderVideo('editVideoPreview', videoValue, provider);
});
$(document).on('change', '#editProvider', function () {
    const videoValue = $('#editVideoId').val();
    const provider = $(this).val();
    Lesson.renderVideo('editVideoPreview', videoValue, provider);
});
// Áp dụng cho cả 2 Modal
$('#modalEditLesson, #modalViewLesson').on('hidden.bs.modal', function () {
    const modal = $(this);
    const iframe = modal.find('iframe');
    const placeholder = modal.find('.video-placeholder');

    // 1. Xóa src để dừng hẳn video và âm thanh
    iframe.attr('src', ''); 
    // 2. Ẩn iframe và hiện lại placeholder để sẵn sàng cho lần mở sau
    iframe.addClass('d-none');
    placeholder.removeClass('d-none');
    
    console.log("Đã dọn dẹp Modal:", modal.attr('id'));
});

    },

    extractVideoId: function(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : url;
    },
extractVideoInfo: function(input) {
    if (!input) return { id: "", provider: "YouTube" };

    input = input.trim();

    // Trường hợp là link YouTube
    if (input.includes("youtube.com") || input.includes("youtu.be")) {
        let id = "";
        if (input.includes("v=")) {
            id = input.split("v=")[1].split("&")[0];
        } else {
            id = input.split("/").pop().split("?")[0];
        }
        return { id: id, provider: "YouTube" };
    }

    // Trường hợp là link Bunny (mediadelivery.net)
    if (input.includes("mediadelivery.net")) {
        // Cắt lấy ID ở cuối link nhúng
        const id = input.split('/').filter(Boolean).pop().split('?')[0];
        return { id: id, provider: "Bunny" };
    }

    // Trường hợp Vinh dán thẳng ID (GUID của Bunny thường dài và có dấu gạch ngang)
    if (input.length > 20 && input.includes("-")) {
        return { id: input, provider: "Bunny" };
    }

    // Mặc định nếu là 11 ký tự thì là YouTube ID
    return { id: input, provider: "YouTube" };
},
addBulkRow: function() {
    const tbody = $('#tblBulkLessons tbody');
    const currentRowsInModal = tbody.find('tr.bulk-row').length; 
    const nextOrder = (this.existingCount || 0) + currentRowsInModal + 1;

    const rowHtml = `
        <tr class="bulk-row">
            <td><input type="text" class="form-control lesson-title" required placeholder="Tên bài học..."></td>
            <td class="video-group">
                <input type="text" class="form-control lesson-video" placeholder="Link Youtube...">
                <span class="video-id-preview small text-muted">ID: <span>---</span></span>
            </td>
            <td><input type="number" class="form-control lesson-order" value="${nextOrder}"></td>
            
            <td class="text-center">
                <div class="form-check form-switch d-inline-block mt-1">
                    <input class="form-check-input lesson-preview" type="checkbox" role="switch">
                </div>
            </td>

            <td class="text-center">
                <button type="button" class="btn btn-link text-danger p-0" onclick="$(this).closest('tr').remove(); Lesson.updateAllBulkOrders();">
                    <i class="bi bi-x-circle-fill fs-5"></i>
                </button>
            </td>
        </tr>`;

    tbody.append(rowHtml);
},
MapsToLesson: async function(chapterId){
    debugger;
    if (!chapterId) {
        toastr.error("Không tìm thấy mã chương!");
        return;
    }
    window.location.href = `/lesson/index.html?chapterId=${chapterId}`;
    
},
renderLessonTable: function(lessons) {
        const tbody = $('#bulkInputBody');
        tbody.empty();

        if (lessons && lessons.length > 0) {
            lessons.forEach((item) => {
                // Vẽ các dòng bài học hiện có vào Modal để Admin có thể sửa hoặc xem
                this.addBulkRow(item); 
            });
        } else {
            // Nếu chưa có bài nào thì tự động thêm 1 dòng trống để nhập
            this.addBulkRow(); 
        }
    },
updateAllBulkOrders: function() {
    const startNum = (this.existingCount || 0) + 1;
    
    $('#tblBulkLessons tbody tr.bulk-row').each(function(index) {
        // index bắt đầu từ 0, 1, 2...
        $(this).find('.lesson-order').val(startNum + index);
    });
},
    saveBulk: async function () {

        const lessons = [];
        
        $('.bulk-row').each(function () {
        const row = $(this); 
        
        const title = row.find('.lesson-title').val();
        const vId = row.data('video-id'); 
        const provider = row.data('provider') || "YouTube"; 
        const order = row.find('.lesson-order').val();
        const durationSeconds = row.find('.lesson-duration').val() || row.data('duration') || 0;
        const isPreview = row.find('.lesson-preview').is(':checked');
        debugger
        // Nếu dòng có nhập liệu thì mới đưa vào mảng
        if (title && vId) {
            lessons.push({
                chapterId: parseInt(Lesson.currentChapterId),
                title: title,
                videoId: vId,
                provider: provider,
                duration: parseInt(durationSeconds),
                orderIndex: parseInt(order),
                isPreview: isPreview,
                courseModelId: Lesson.currentCourseId
            });
        }
    });

    // BƯỚC 4: KIỂM TRA MẢNG TRƯỚC KHI GỌI API
    if (lessons.length === 0) {
        Swal.fire("Nhắc nhở", "Bác chưa nhập bài học nào vào bảng cả", "warning");
        return;
    }

    // BƯỚC 5: GỌI API GỬI MẢNG ĐI
    try {
        await $.ajax({
            url: `${Lesson.config.apiUrl}/bulk`,
            type: 'POST',
            contentType: 'application/json', // Bắt buộc báo cho Server biết đây là JSON
            data: JSON.stringify(lessons)    // Biến Mảng JS thành Chuỗi JSON
        });

        Swal.fire("Ngon rồi!", "Đã lưu toàn bộ bài học", "success");
        $('#lessonModal').modal('hide');
        Lesson.loadData(); // Tải lại bảng danh sách
    } catch (e) {
        Swal.fire("Lỗi!", "Server không nhận mảng này rồi bác", "error");
    }
},

    // Hàm lấy dữ liệu từ API
     loadData:async function() {
        const urlParams = new URLSearchParams(window.location.search);
        const chapterId = urlParams.get('chapterId');
        
        if (!chapterId) return;
        Lesson.currentChapterId = chapterId;
        const apiUrl = Lesson.config.apiUrl;
        const params = new URLSearchParams({
            chapterId: chapterId,
            keySearch: $('#keySearch').val() || '',

            isPreview: $('#isPreview').val() || '',

            isActive: $('#isActive').val() || -1

        });
    try {

        debugger;

        const response = await fetch(`${apiUrl}/list-data?${params.toString()}`);
        if (!response.ok) throw new Error('Mạng lỗi hoặc Server có vấn đề');
        const res = await response.json();
        console.log("Dữ liệu thực tế từ API:", res);

        if (res.success || res.Success) {
            Lesson.currentCourseId = res.courseId;
           if (!Lesson.isChapterNameLoaded && res.data && res.data.length > 0) {
                $('#displayChapterId').text(res.data[0].chapterName);
                Lesson.isChapterNameLoaded = true; 
            }
            Lesson.renderTable(res.data);
        }

    } catch (error) {

        console.error("Lỗi khi lấy dữ liệu:", error);

    }

},
// previewVideo: function(videoId, title) {
//     const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    
//     // Gán tiêu đề và đường dẫn vào iframe
//     $('#previewTitle').text(title);
//     $('#videoIframe').attr('src', embedUrl);
    
//     // Mở modal
//     $('#previewModal').modal('show');
// },
renderVideo: function(iframeId, videoId, provider = "YouTube") {
    const iframe = $(`#${iframeId}`);
    const placeholder = iframe.siblings('.video-placeholder');
    const id = videoId ? videoId.trim() : ""; 

    // Reset trạng thái
    iframe.attr('src', '').addClass('d-none');
    placeholder.removeClass('d-none');

    if (!id) return;

    setTimeout(() => {
        let embedUrl = "";

        if (provider === "Bunny") {
            // Cấu trúc URL của Bunny Stream
            // Lưu ý: Thay YOUR_PULL_ZONE_ID bằng ID thư viện của bạn nếu cần cố định
            const libraryId = "635360"; // Ví dụ ID thư viện Bunny của bạn
            embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${id}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
        } else {
            // Mặc định là YouTube
            const cleanId = Lesson.extractVideoId(id);
            const origin = window.location.origin;
            embedUrl = `https://www.youtube.com/embed/${cleanId}?origin=${origin}&enablejsapi=1&rel=0&autoplay=0`;
        }

        placeholder.addClass('d-none');
        iframe.attr('src', embedUrl).removeClass('d-none'); 
    }, 200);
},
    renderTable: function (data) {
    let html = '';

    // Nếu không có dữ liệu thì hiện dòng thông báo
    if (!data || data.length === 0) {
        html = '<tr><td colspan="7" class="text-center py-5 text-muted">' +
               '<i class="bi bi-folder2-open display-4 d-block mb-2"></i>' +
               'Chương này chưa có bài học nào bác ơi!</td></tr>';
        $('#mainLessonBody').html(html);
        return;
    }

    // Duyệt qua từng bài học để vẽ dòng (row)
    data.forEach((item, index) => {
        // 1. Xử lý Badge Trạng thái (Hoạt động / Tạm ẩn)
        const statusClass = item.isActive 
            ? 'bg-success-subtle text-success border-success' 
            : 'bg-secondary-subtle text-secondary border-secondary';
        const statusText = item.isActive ? 'Hoạt động' : 'Tạm ẩn';
        
        // 2. Xử lý Badge Học thử (Dùng info cho nổi bật)
        const previewBadge = item.isPreview 
            ? '<span class="badge bg-info-subtle text-info border border-info ms-2" style="font-size: 0.65rem;">HỌC THỬ</span>' 
            : '';

        // 3. Xử lý định dạng thời gian (Giây -> Phút:Giây)
        const formattedTime = item.formattedDuration || (item.duration + 's');

        html += `
            <tr class="align-middle text-center" data-id="${item.id}">
                <td class="drag-handle" style="cursor: grab; width: 40px;">
                    <i class="bi bi-grip-vertical text-muted fs-5"></i>
                </td>

                <td class="text-muted small" style="width: 50px;">${index + 1}</td>

                <td class="text-start">
                    <div class="d-flex align-items-center">
                        <span class="fw-bold text-dark me-1">${item.title}</span>
                        ${previewBadge}
                    </div>
                    <div class="mt-1">
                        <small class="text-muted" style="font-size: 0.7rem;">
                            <i class="bi bi-calendar3 me-1"></i>${new Date(item.createdAt).toLocaleDateString('vi-VN')}
                        </small>
                    </div>
                </td>

                <td>
                    <div class="d-inline-flex flex-column align-items-start">
                        <span class="badge bg-white text-primary border mb-1" style="font-size: 0.7rem;">
                            <i class="bi bi-youtube me-1 text-danger"></i>${item.provider || 'YouTube'}
                        </span>
                        <code class="text-muted small font-monospace">${item.videoId}</code>
                    </div>
                </td>

                <td>
                    <span class="badge bg-light text-dark border fw-normal">
                        <i class="bi bi-clock me-1 text-primary"></i>${formattedTime}
                    </span>
                </td>

                <td>
                    <span class="badge ${statusClass} border px-2">
                        <i class="bi bi-circle-fill me-1" style="font-size: 0.5rem;"></i>${statusText}
                    </span>
                </td>

                <td style="width: 150px;">
                    <div class="btn-group shadow-sm" style="border-radius: 8px; overflow: hidden;">
                        <button class="btn btn-sm btn-white border" 
                                onclick="Lesson.openDetailModal(${item.id})" title="Xem chi tiết">
                            <i class="bi bi-eye text-info"></i>
                        </button>
                        <button class="btn btn-sm btn-white border" 
                                onclick="Lesson.openUpdateModal(${item.id})" title="Sửa bài học">
                            <i class="bi bi-pencil-square text-primary"></i>
                        </button>
                        <button class="btn btn-sm btn-white border text-danger" 
                                onclick="Lesson.deleteLesson(${item.id})" title="Xóa bài học">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    // 4. Đổ HTML vào Table Body
    $('#mainLessonBody').html(html);

    // 5. Kích hoạt tính năng kéo thả SortableJS
    Lesson.initSortable();
},
openDetailModal: async function (id) {
    // 1. Mở modal và xóa dữ liệu cũ (để tránh hiện video của bài trước)
    $('#modalViewLesson').modal('show');
    $('#viewVideoPlayer').attr('src', ''); 
    $('.video-placeholder').removeClass('d-none');

    try {
        const response = await fetch(`https://lms-u2jn.onrender.com/api/Lesson/${id}`);
        if (!response.ok) throw new Error('Không lấy được dữ liệu bài học');
        
        const item = await response.json(); 
        $('#viewTitle').text(item.title);
        $('#viewProvider').text(item.provider || "YouTube");
        $('#viewDuration').text(item.formattedDuration || (item.duration + ' giây'));
        $('#viewOrder').text('#' + item.orderIndex);
        $('#viewVideoId').text(item.videoId);
        
        if (item.createdAt) {
            $('#viewCreatedAt').text(new Date(item.createdAt).toLocaleDateString('vi-VN'));
        }
        let statusHtml = '';
        statusHtml += item.isActive 
            ? '<span class="badge bg-success-subtle text-success border border-success px-3 py-2"><i class="bi bi-check-circle me-1"></i>Hoạt động</span>' 
            : '<span class="badge bg-danger-subtle text-danger border border-danger px-3 py-2"><i class="bi bi-lock me-1"></i>Đang khóa</span>';
        
        statusHtml += item.isPreview 
            ? '<span class="badge bg-info-subtle text-info border border-info px-3 py-2"><i class="bi bi-unlock me-1"></i>Học thử</span>' 
            : '<span class="badge bg-secondary-subtle text-secondary border border-secondary px-3 py-2"><i class="bi bi-shield-lock me-1"></i>Trả phí</span>';
        
        $('#viewStatusBadges').html(statusHtml);
        Lesson.renderVideo('viewVideoPlayer', item.videoId, item.provider);

    } catch (err) {
        console.error("Lỗi:", err);
        toastr.error("Bác ơi, lỗi tải chi tiết rồi!");
        $('#modalViewLesson').modal('hide');
    }
},
renderDetailTable: function (data) {
    let html = '';
    let tbody = $('#detailLessonTableBody');

    if (!data || data.length === 0) {
        tbody.html('<tr><td colspan="4" class="text-center text-muted py-5">Khóa này chưa có bài nào bác ạ!</td></tr>');
        return;
    }

    data.forEach((item, index) => {
        const safeTitle = (item.title || "").replace(/'/g, "\\'");
        const safeCourse = ($('#detailCourseName').text() || "Khóa học").replace(/'/g, "\\'");
        const safeDuration = (item.formattedDuration || "00:00").replace(/'/g, "\\'");
        const cleanId = item.videoId ? item.videoId.split(' ')[0] : '';

        html += `
            <tr data-id="${item.id}" class="sortable-row"> 
               <td class="text-center" style="width: 5%">
    <div class="drag-handle">
        <i class="bi bi-grid-3x2-gap-fill text-muted opacity-50"></i>
    </div>
</td>
                <td class="text-muted ps-2" style="width: 8%">${index + 1}</td>
                <td style="width: 52%">
                    <div class="fw-bold text-dark">${item.title}</div>
                </td>
                <td class="text-end pe-4" style="width: 35%">
                    <div class="d-flex justify-content-end align-items-center gap-2">
                        <button class="btn btn-sm btn-outline-warning rounded-circle" 
                                onclick="Lesson.openUpdateModal(${item.id})" title="Sửa">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger rounded-circle" 
                                onclick="Lesson.delete(${item.id})" title="Xóa">
                            <i class="bi bi-trash3"></i>
                        </button>
                        <div class="ms-1 me-1 text-light">|</div>
                        <button class="btn btn-danger btn-sm rounded-pill px-3 shadow-sm" 
                                onclick="Lesson.playVideo('${cleanId}', '${safeTitle}', '${safeCourse}', '${safeDuration}')">
                            <i class="bi bi-play-circle-fill me-1"></i> Phát bài
                        </button>
                    </div>
                </td>
            </tr>`;
    });

    tbody.html(html);

    // 2. KÍCH HOẠT KÉO THẢ SAU KHI RENDER XONG
    Lesson.initSortable();
},

initSortable: function() {
    const el = document.getElementById('mainLessonBody');
    if (!el) return;

    Sortable.create(el, {
        handle: '.drag-handle', // Chỉ cho phép nắm kéo ở cột icon 6 chấm
        animation: 150,
        ghostClass: 'bg-light', // Hiệu ứng khi đang kéo
        onEnd: async function() {
            // 1. Lấy danh sách ID theo thứ tự mới từ thuộc tính data-id
            const sortedIds = [];
            $('#mainLessonBody tr').each(function() {
                sortedIds.push(parseInt($(this).data('id')));
            });

            console.log("Thứ tự mới:", sortedIds);

            // 2. Gọi API để cập nhật vào Database
            try {
                const response = await fetch(`${Lesson.config.apiUrl}/update-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sortedIds)
                });

                if (response.ok) {
                    toastr.success("Đã cập nhật thứ tự bài học!");
                } else {
                    toastr.error("Lỗi khi lưu thứ tự bài học");
                }
            } catch (err) {
                console.error(err);
                toastr.error("Không thể kết nối máy chủ");
            }
        }
    });
},

saveNewOrder: async function(ids) {
    try {
        // Gửi mảng ID về Backend (Ví dụ: [15, 12, 18, 20...])
        const response = await fetch(`${this.config.apiUrl}/update-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ids)
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Đã cập nhật thứ tự!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
        }
    } catch (err) {
        console.error("Lỗi cập nhật thứ tự:", err);
    }
},
// openUpdateLessonModal: async function(id) {
//     try {
//         const response = await fetch(`${this.config.apiUrl}/${id}`);
//         if (!response.ok) throw new Error('Không lấy được dữ liệu');
//         debugger;
//         const res = await response.json();
//         const item = res.data || res;      

//         // Gán dữ liệu vào Modal
//         $('#editLessonId').val(item.id);
//         $('#editTitle').val(item.title);
//         $('#editDuration').val(item.duration || 0);
//         console.log(item.duration)
//         // CHỖ NÀY SỬA LẠI: Gán videoId chứ không phải description bác nhé
//         $('.lesson-video').val(item.videoId); 
//         $('#editIsActive').prop('checked', item.isActive); 
//         $('#editVideoId').text(item.videoId);
//         // 1. Cập nhật nhãn trạng thái (Hoạt động/Khóa)
//         lessons.updateEditStatusLabel(item.isActive);

//         // 2. Tự động hiển thị ID nhận diện ngay khi mở modal
//         const extractedId = Lesson.extractVideoId(item.videoId || "");
//         if (extractedId) {
//             $('#editVideoPreviewText').html(`<i class="bi bi-check-circle-fill me-1"></i> ID nhận diện: ${extractedId}`);
//         } else {
//             $('#editVideoPreviewText').text("");
//         }

//         $('#editLessonModal').modal('show');
//     } catch (error) {
//         console.error("Lỗi khi lấy thông tin:", error);
//         Swal.fire("Lỗi!", "Không thể lấy thông tin bài học bác ơi!", "error");
//     }
// },

// Hàm phụ để cập nhật chữ hiển thị trạng thái
updateEditStatusLabel: function(isActive) {
    const lbl = $('#lblEditStatus');
    if (isActive) {
        lbl.text("Đang hoạt động").addClass("text-success").removeClass("text-danger");
    } else {
        lbl.text("Đang tạm khóa").addClass("text-danger").removeClass("text-success");
    }
},
// playVideo: function (videoId, title, course, duration) {
//     // 1. Setup dữ liệu (giữ nguyên)
//     const cleanId = String(videoId).split(' ')[0];
//     const embedUrl = `https://www.youtube.com/embed/${cleanId}?autoplay=1`;

//     $('#mainVideoPlayer').attr('src', embedUrl);
//     $('#previewLessonTitle').text(title);
//     $('#previewCourseName').text(course);
//     $('#previewDuration').text(duration);

//     // 2. QUAN TRỌNG: Lấy thẻ Modal Video
//     var modalElement = document.getElementById('videoPreviewModal');
//     document.body.appendChild(modalElement);
//     var existingModal = bootstrap.Modal.getInstance(modalElement);
//     if (existingModal) {
//         existingModal.dispose();
//     }
//     var myModal = new bootstrap.Modal(modalElement, {
//         backdrop: true,
//         keyboard: true,
//         focus: true
//     });
    
//     myModal.show();
// },
delete: async function(id) {
    const result = await Swal.fire({
        title: "Bạn có chắc muốn xóa?",
        text: "Thao tác này sẽ không thể hoàn tác!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Xóa ngay",
        cancelButtonText: "Hủy"
    });
    if (result.isConfirmed) {
        try {
            const res = await $.ajax({
                url: `${Lesson.config.apiUrl}/${id}`,
                type: "DELETE"
            });
            Swal.fire("Thành công!", res.message || "Đã xóa bài học.", "success");
            Course.loadData(1);

        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            Swal.fire("Lỗi!", "Không thể xóa bản ghi này.", "error");
        }
    }
},

    openCreateModal: function() {
    $('#frmLessonBulk')[0].reset();
    $('#tblBulkLessons tbody').empty();
    Lesson.existingCount = 0;
    Lesson.addBulkRow(); 
    $('#lessonModal').modal('show');
},
    loadCategories: async function () {
        if (this.categories.length > 0) {
            console.log("Dùng dữ liệu danh mục từ cache");
            return; 
        }

        try {
            console.log("Gọi API lấy danh mục lần đầu");
            const response = await fetch(`https://lms-u2jn.onrender.com/api/Lesson`);
            Lesson.categories = await response.json(); 
            console.log(Lesson.categories)
            let filterHtml = '<option value="">Tất cả danh mục</option>';
            let modalHtml = '<option value="">-- Chọn danh mục --</option>';
            Lesson.categories.forEach(item => {
            const option = `<option value="${item.id}">${item.name}</option>`;
            filterHtml += option;
            modalHtml += option;
    });

    $('#filterCategory').html(filterHtml);
    $('#ddlCategoryId').html(modalHtml);
    $('#editDdlCategoryId').html(modalHtml);
        } catch (error) {
            console.error("Lỗi load danh mục:", error);
        }
    },
create: async function() {
    var form = $('#frmLesson')[0];
    var formData = new FormData(form);

    // Checkbox vẫn phải set thủ công vì nó không tự lấy true/false
    formData.set('IsActive', $('#txtIsActive').is(':checked'));
    Swal.fire({
            title: 'Đang xử lý...',
            text: 'Vui lòng chờ trong giây lát khi hệ thống tải ảnh lên Cloud',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading(); // Hiển thị spinner quay quay của SweetAlert2
            }
        });
        const btnSave = $('#btnSave');
        btnSave.prop('disabled', true);
    try {
        const response = await $.ajax({
            url: Lesson.config.apiUrl,
            type: 'POST',
            data: formData,
            processData: false, // Bắt buộc
            contentType: false,  // Bắt buộc
        });

        Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: response.message || "Khóa học đã được lưu",
            timer: 2000,
            showConfirmButton: false
        });
        $('#LessonModal').modal('hide');
        Lesson.loadData(1);
        formElement.reset();
        $('#imgPreview').hide();
        // ... reload data
    } catch (error) {
        console.error("Lỗi chi tiết:", error.responseJSON);
    }
},
    openUpdateModal: async function(id) {
    try {
        debugger;
        const response = await fetch(`${Lesson.config.apiUrl}/${id}`);
        if (!response.ok) throw new Error('Không lấy được dữ liệu');
        
        const res = await response.json();
        const item = res.data || res; 
        
        // Gán dữ liệu cơ bản
        $('#editLessonId').val(item.id);
        $('#editTitle').val(item.title);
        $('#editVideoId').val(item.videoId);
        
        // Gán Provider và Duration mới thêm
        $('#editProvider').val(item.provider || "YouTube");
        $('#editDuration').val(item.duration);
        $('#editFormattedDuration').text(item.formattedDuration || "00h 00m");

        // Gán trạng thái (Switch và Select)
        $('#editIsPreview').val(item.isPreview.toString()); 
        $('#editIsActive').prop('checked', item.isActive); 

        // Cập nhật Label trạng thái
        const label = $('#editLblStatus'); 
        if (item.isActive) {
            label.text('Đang Hoạt động').removeClass('text-danger').addClass('text-success');
        } else {
            label.text('Đang Khóa').removeClass('text-success').addClass('text-danger');
        }
        Lesson.renderVideo('editVideoPreview',item.videoId, item.provider);
        $('#modalEditLesson').modal('show');
    } catch (error) {
        console.error("Lỗi khi load dữ liệu sửa:", error);
        toastr.error("Có lỗi xảy ra: " + (error.message || "Không rõ nguyên nhân"));
    }
},
   
  update: async function() {
    const id = $('#editLessonId').val(); 
    console.log("Đang gửi ID lên URL:", id); 

    var form = $('#formEditLesson')[0];
    var formData = new FormData(form); 
    formData.set('IsActive', $('#editIsActive').is(':checked'));
    const videoId = Lesson.extractVideoId($('#editVideoId').val());
    const durationSeconds = $('#editDuration').val() || 0;
    formData.set("VideoId", videoId);
    formData.set("Duration", durationSeconds);
    Swal.fire({
        title: 'Đang lưu thay đổi...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const response = await $.ajax({
            // 3. Đảm bảo URL có ID số (Ví dụ: /api/Lesson/5)
            url: `${Lesson.config.apiUrl}/${id}`, 
            type: 'PUT',
            data: formData,
            processData: false,
            contentType: false,
        });

        Swal.fire("Thành công!", "Đã cập nhật bài học", "success");
        $('#modalEditLesson').modal('hide');
         Lesson.loadData();

    } catch (error) {
        console.error("Lỗi chi tiết từ Server:", error.responseJSON);
        // Nếu bị lỗi 400, dòng này sẽ hiện đúng cái IsActive hay ID bị lỗi
        let errorDetail = error.responseJSON?.errors 
                          ? JSON.stringify(error.responseJSON.errors) 
                          : "Cập nhật thất bại";
        Swal.fire("Lỗi!", errorDetail, "error");
    }
},
detail: async function(id){
     try {
        const response = await fetch(`${this.config.apiUrl}/${id}`);
        if (!response.ok) throw new Error('Không lấy được dữ liệu');
        const res = await response.json();
        const item = res.data || res;      
        $('#dtlId').text(item.LessonId);
        $('#dtlCategory').text(item.categoryName)
        $('#dtlName').text(item.name);
        $('#dtlDescription').text(item.description || 'Chưa có mô tả.');
        $('#dtlDescriptionShort').text(item.description || 'Chưa có tóm tắt.');
        if (item.price === 0) {
            $('#dtlPrice').html('<span class="text-success">Miễn phí</span>');
        } else {
            const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price);
            $('#dtlPrice').text(formattedPrice);
        }
        let thumb = item.thumbnailUrl;
        if (!thumb) {
            thumb = "https://placehold.co/600x400?text=No+Image";
        }
        $('#dtlThumbnail').attr('src', thumb);
        $('#dtlCreatedAt').text(new Date(item.createAt).toLocaleString('vi-VN'));
        const statusHtml = item.isActive 
            ? '<span class="badge bg-success">Hoạt động</span>' 
            : '<span class="badge bg-danger">Đang khóa</span>';
        $('#dtlStatusBadge').html(statusHtml);
        $('#detailLessonModal').modal('show');     
        
    } catch (error) {
        console.error("Lỗi khi thêm:", error);
        alert("Có lỗi xảy ra: " + (error.responseJSON?.message || "Không rõ nguyên nhân"));
    }
},
delete: async function(id) {
    const result = await Swal.fire({
        title: "Bạn có chắc muốn xóa?",
        text: "Thao tác này sẽ không thể hoàn tác!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Xóa ngay",
        cancelButtonText: "Hủy"
    });
    if (result.isConfirmed) {
        try {
            const res = await $.ajax({
                url: `${Lesson.config.apiUrl}/${id}`,
                type: "DELETE"
            });
            Swal.fire("Thành công!", res.message || "Đã xóa danh mục.", "success");
            Lesson.loadData(1);

        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            Swal.fire("Lỗi!", "Không thể xóa bản ghi này.", "error");
        }
    }
},
showPaging: function (totalCount, totalPages, currentPage) {
    $('#total-records').text(totalCount);
    if (totalPages <= 1) {
        $('#paging-ul').empty();
        $('#paging-ul').removeData("twbs-pagination");
        $('#paging-ul').unbind("page");
        return;
    }
    $('#paging-ul').twbsPagination('destroy');

    // 4. Khởi tạo phân trang
    $('#paging-ul').twbsPagination({
        totalPages: totalPages,
        visiblePages: 5,
        startPage: currentPage,
        first: '<i class="bi bi-chevron-double-left"></i>', // Dùng Bootstrap Icon cho đồng bộ
        prev: '<i class="bi bi-chevron-left"></i>',
        next: '<i class="bi bi-chevron-right"></i>',
        last: '<i class="bi bi-chevron-double-right"></i>',
        onPageClick: function (event, page) {
            if (page !== currentPage) {
                Lesson.loadData(page); // Gọi lại hàm load dữ liệu của bạn
            }
        }
    });
}
};


// Chạy khởi tạo
$(document).ready(function () {
    Lesson.init();
    Lesson.addBulkRow();
});