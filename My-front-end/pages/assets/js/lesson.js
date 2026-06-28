const Toast1 = Swal.mixin({
    toast: true,
    position: 'top-end', // Góc trên bên phải
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});
const getVideoDuration = (file) => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = function () {
            window.URL.revokeObjectURL(video.src);
            resolve(Math.round(video.duration)); // Trả về số giây làm tròn
        };
        
        video.onerror = function () {
            resolve(0); // Lỗi thì trả về 0
        };
        
        video.src = URL.createObjectURL(file);
    });
};
var Lesson = {
    categories: [],
    sortableInstance: null,
    existingCount : 0,
    currentChapterId : 0,
    currentCourseId : 0,
    isChapterNameLoaded: false,
    config: {
        apiUrl: "https://lms-u2jn.onrender.com/api/Lesson",
        apiUrlBunny: "https://lms-u2jn.onrender.com/api/Bunny"
    },
    
    // Hàm khởi tạo - Gọi khi trang load xong
    init: function () {
        Lesson.loadData();
        Lesson.registerEvents();  
    },
    resetFilter: function() {
   $('#keySearch').val('');
    
    $('#isPreview').val(''); 
    $('#isActive').val('-1');
    if (typeof this.uncheckAll === 'function') {
        this.uncheckAll();
    }
    this.loadData(1);
},
registerCheckboxEvents: function () {
        const _this = this;

        $(document).off('change', '#check-all').on('change', '#check-all', function () {
            const isChecked = $(this).prop('checked');
            $('.item-check').prop('checked', isChecked);
            _this.toggleBulkActions();
        });

        // Sự kiện từng ô lẻ
        $(document).off('change', '.item-check').on('change', '.item-check', function () {
            const total = $('.item-check').length;
            const checked = $('.item-check:checked').length;
            $('#check-all').prop('checked', total > 0 && total === checked);
            _this.toggleBulkActions();
        });
    },
    toggleBulkActions: function () {
        const selectedCount = $('.item-check:checked').length;
        const $bulkArea = $('#bulk-actions');
        const $countDisplay = $('#selected-count');

        if (selectedCount > 0) {
            $countDisplay.text(selectedCount);
            $bulkArea.css({ 'visibility': 'visible', 'opacity': '1' });
        } else {
            $bulkArea.css('opacity', '0');
            setTimeout(() => {
                if ($('.item-check:checked').length === 0) {
                    $bulkArea.css('visibility', 'hidden');
                }
            }, 200);
            $('#check-all').prop('checked', false);
        }
    },

    uncheckAll: function() {
        $('.item-check, #check-all').prop('checked', false);
        this.toggleBulkActions();
    },
    // Đăng ký tất cả sự kiện ở đây (Thay vì viết onclick trong HTML)
    registerEvents: function () {
        this.registerCheckboxEvents()
        $(document).on('input', '.txtVideoLink', function() {
            const val = $(this).val();
            const id = Lesson.extractVideoId(val);
            const parent = $(this).closest('.modal-body');
            parent.find('.txtVideoId').val(id);
            parent.find('.lblVideoId').text(id);
        });

 // Bắt sự kiện khi dán link YouTube
$(document).on('input', '.lesson-video-link', async function () {
    const row = $(this).closest('.bulk-row'); 
    const inputVal = $(this).val().trim();
    const previewSpan = row.find('.youtube-input-group .video-id-preview span');
    if (!inputVal) {
        previewSpan.html('---');
        row.removeData('video-id');
        row.removeData('duration');
        row.find('.lesson-duration').val(''); 
        return;
    }

    // Dùng Regex bóc ID YouTube
    const match = inputVal.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
    const videoId = (match && match[1]) ? match[1] : null;

    if (videoId) {
        row.data('video-id', videoId);
        row.data('provider', 'YouTube');
        
        // 2. Hiển thị UI
        previewSpan.html(`<small class="badge bg-danger">YouTube</small> <code>${videoId}</code>`);
    
        try {
            // Hiển thị trạng thái đang tải
            row.find('.lesson-duration').attr('placeholder', 'Đang lấy...');
            
            const res = await fetch(`${Lesson.config.apiUrl}/get-duration/${videoId}`);
            if (res.ok) {
                const data = await res.json();
                row.find('.lesson-duration').val(data.seconds); 
                row.data('duration', data.seconds); 
                let titleInput = row.find('.lesson-title');
                if (data.title && !titleInput.val()) {
                    titleInput.val(data.title);
                }
            }
        } catch (e) { 
            console.error("Lỗi lấy thông tin YTB:", e); 
        }
    } else {
        // Báo lỗi nếu dán sai link
        previewSpan.html('<span class="text-danger">Link không hợp lệ</span>');
        row.removeData('video-id');
    }
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

// Bắt sự kiện khi teacher thay đổi nguồn (Provider)
$(document).on('change', '.lesson-provider', function () {
    const row = $(this).closest('.bulk-row');
    const selectedProvider = $(this).val(); 
    
    // Lưu thẳng provider vào DOM để lát saveBulk lấy ra dùng
    row.data('provider', selectedProvider);

    if (selectedProvider === 'YouTube') {
        // Hiện input YouTube, Ẩn input Bunny
        row.find('.bunny-input-group').addClass('d-none');
        row.find('.youtube-input-group').removeClass('d-none');
        
        // Nếu trước đó đã lỡ chọn file tạo rác Bunny thì gọi API xóa rác
        const videoId = row.data('video-id');
        const token = localStorage.getItem("jwt_token") || localStorage.getItem("token");
        if (videoId && row.data('raw-file')) {
            $.ajax({
                url: `${Lesson.config.apiUrl}/bunny/${videoId}`,
                type: 'DELETE',
                headers: { "Authorization": "Bearer " + token }
            }).catch(e => console.log("Lỗi xóa rác:", e));
            
            // Xóa dữ liệu cũ của Bunny đi
            row.removeData('video-id');
            row.removeData('raw-file');
            row.find('.upload-status').html('<i class="bi bi-info-circle"></i> Chưa chọn file').attr('class', 'upload-status text-muted fw-bold');
        }
    } else {
        // Hiện input Bunny, Ẩn input YouTube
        row.find('.youtube-input-group').addClass('d-none');
        row.find('.bunny-input-group').removeClass('d-none');
    }
});
// 📍 BẮT SỰ KIỆN: Khi teacher tải file lên (Gọi API Init lấy VideoId)
$(document).on('change', '.lesson-file-input', async function (e) {
    const file = e.target.files[0];
    const row = $(this).closest('.bulk-row');
    const statusText = row.find('.upload-status');
    const token = localStorage.getItem("jwt_token") || localStorage.getItem("token");

    // Nếu teacher ấn nút chọn file nhưng lại Cancel (hủy)
    if (!file) {
        statusText.html('<i class="bi bi-info-circle"></i> Chưa chọn file').attr('class', 'upload-status text-muted fw-bold');
        row.removeData('raw-file');
        row.removeData('video-id');
        row.find('.video-id-preview').hide();
        return;
    }

    // Tiện ích UX: Tự điền tên file vào ô Tiêu đề bài học nếu đang trống
    let titleInput = row.find('.lesson-title');
    if (!titleInput.val()) {
        titleInput.val(file.name.replace(/\.[^/.]+$/, "")); 
    }

    // Hiển thị trạng thái Loading
    statusText.html('<div class="spinner-border spinner-border-sm text-primary" role="status"></div> Đang khởi tạo...')
              .removeClass('text-muted').addClass('text-primary');

    try {
        // Gọi Backend C# để sang Bunny xin cái thùng rỗng (VideoId)
        const res = await $.ajax({
            url: `${Lesson.config.apiUrlBunny}/init`,
            type: 'POST',
            contentType: 'application/json',
            headers: { "Authorization": "Bearer " + token },
            data: JSON.stringify({ title: titleInput.val() })
        });

        // Cất ID và file vật lý vào thẻ <tr> để lát saveBulk lôi ra dùng
        row.data('video-id', res.videoId);
        row.data('raw-file', file);
        
        // Cập nhật giao diện báo thành công
        row.find('.video-id-preview').show().find('span').text(res.videoId);
        statusText.html('<i class="bi bi-check-circle-fill"></i> Đã sẵn sàng tải lên')
                  .removeClass('text-primary').addClass('text-success');

    } catch (err) {
        console.error(err);
        statusText.html('<i class="bi bi-exclamation-triangle-fill"></i> Lỗi khởi tạo trên hệ thống')
                  .removeClass('text-primary').addClass('text-danger');
    }
});
// 📍 BẮT SỰ KIỆN: Khi teacher xóa dòng (Gọi API Delete dọn rác Bunny)
$(document).on('click', '.btn-remove-row', async function () {
    debugger
    const btn = $(this);
    const row = btn.closest('.bulk-row');
    const videoId = row.data('video-id');
    const provider = row.data('provider') || "YouTube"; // Mặc định là YouTube
    const token = localStorage.getItem("jwt_token") || localStorage.getItem("token");

    // Chỉ gọi dọn rác nếu dòng này đang chọn Bunny VÀ đã lỡ sinh VideoId
    if (provider === 'Bunny' && videoId) {
        // Đổi icon thùng rác thành xoay xoay cho chuyên nghiệp
        btn.html('<div class="spinner-border spinner-border-sm text-danger" role="status"></div>');
        
        try {
            await $.ajax({
                url: `${Lesson.config.apiUrlBunny}/${videoId}`,
                type: 'DELETE',
                headers: { "Authorization": "Bearer " + token }
            });
            console.log(`Đã dọn dẹp rác VideoId: ${videoId} thành công`);
        } catch (e) {
            console.warn("Lỗi dọn rác, file sẽ tự bị xóa theo lịch trình:", e);
        }
    }

    // Xóa thẻ HTML của dòng đó
    row.remove();
    
    // Đánh lại số Thứ tự (STT) cho các dòng còn lại (Nếu hệ thống bác có)
    // Lesson.updateAllBulkOrders(); 
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
        <tr class="bulk-row" data-provider="YouTube"> <td>
                <input type="text" class="form-control lesson-title" required placeholder="Tên bài học...">
            </td>
            
            <td class="video-group position-relative" style="width: 45%;">
                <select class="form-select form-select-sm lesson-provider fw-bold text-primary mb-1">
                    <option value="YouTube" selected>Nguồn: YouTube (Link)</option>
                    <option value="Bunny">Nguồn: Bunny (Tải lên)</option>
                </select>

                <div class="youtube-input-group">
    <input type="text" class="form-control lesson-video-link" placeholder="Dán link YouTube vào đây...">
    
    <div class="mt-1">
        <span class="video-id-preview small text-muted">ID: <span>---</span></span>
    </div>
</div>
                <div class="bunny-input-group d-none">
                    <input type="file" class="form-control lesson-file-input" accept="video/mp4,video/webm,video/*">
                    
                    <div class="d-flex justify-content-between align-items-center mt-1">
                        <small class="upload-status text-muted fw-bold"><i class="bi bi-info-circle"></i> Chưa chọn file</small>
                        <span class="video-id-preview small text-muted" style="display: none;">ID: <span>---</span></span>
                    </div>
                    
                    <div class="progress mt-1 d-none upload-progress-bar" style="height: 6px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" style="width: 0%"></div>
                    </div>
                </div>
            </td>
            
            <td style="width: 100px;">
                <input type="number" class="form-control lesson-order text-center" value="${nextOrder}">
            </td>
            
            <td class="text-center" style="width: 80px;">
                <div class="form-check form-switch d-inline-block mt-1">
                    <input class="form-check-input lesson-preview" type="checkbox" role="switch">
                </div>
            </td>

            <td class="text-center" style="width: 60px;">
                <button type="button" class="btn btn-link text-danger p-0 btn-remove-row">
                    <i class="bi bi-x-circle-fill fs-5"></i>
                </button>
            </td>
        </tr>`;

    tbody.append(rowHtml);
},
MapsToLesson: async function(chapterId, courseId) {
        if (!chapterId) {
            toastr.error("Không tìm thấy mã chương!");
            return;
        }
        
        // Gửi cả 2 lên URL
        window.location.href = `/lesson/index.html?chapterId=${chapterId}&courseId=${courseId}`;
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
    const token = localStorage.getItem("jwt_token") || localStorage.getItem("token");
    const rows = $('.bulk-row').toArray();
    const lessons = [];

    if (rows.length === 0) {
        Toast1.fire({ icon: 'warning', title: 'Bác chưa nhập bài học nào vào bảng cả' });
        return;
    }

    const hasPending = $('.bulk-row').toArray().some(row => $(row).data('provider') === 'Bunny' && $(row).data('raw-file') && !$(row).data('video-id'));
    if (hasPending) {
        Toast1.fire({ icon: 'warning', title: 'Có video đang khởi tạo ID, bác đợi 1-2 giây rồi bấm lưu nhé!' });
        return;
    }

    try {
        const saveBtn = $('#btnSaveBulk'); 
        saveBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Đang xử lý...');

        // 🚩 THÊM DÒNG NÀY ĐỂ KHÓA TẤT CẢ INPUT TRONG FORM
        // Lấy tất cả input, select, button trong modal (ngoại trừ nút đóng modal) và disable chúng
        $('#tblBulkLessons').find('input, select, button').prop('disabled', true);
$('.btn-close, [data-bs-dismiss="modal"]').prop('disabled', true);
        // ==========================================
        // 📍 GIAI ĐOẠN 1: DUYỆT VÀ UPLOAD FILE (NẾU CÓ)
        // ==========================================
        for (const rowElement of rows) {
            const row = $(rowElement);
            const provider = row.data('provider') || "YouTube"; 
            let finalVideoId = ""; 

            if (provider === 'YouTube') {
                finalVideoId = row.data('video-id') || row.find('.lesson-video-link').val();
            } 
            else if (provider === 'Bunny') {
                finalVideoId = row.data('video-id');
                const file = row.data('raw-file');
                
                if (file && finalVideoId) {
                    const statusText = row.find('.upload-status');
                    const progressBarContainer = row.find('.upload-progress-bar');
                    const progressBar = progressBarContainer.find('.progress-bar');
                    
                    const libraryId = "691685"; 
                    const accessKey = "b1f53d02-5dbc-4ea7-a24a5ef1dc34-b4ef-45d9"; 
                    const durationInSeconds = await getVideoDuration(file);
                    row.data('duration', durationInSeconds);
                    
                    progressBarContainer.removeClass('d-none');
                    statusText.html('<div class="spinner-grow spinner-grow-sm text-primary"></div> Đang tải lên...')
                              .removeClass('text-success').addClass('text-primary');

                    await $.ajax({
                        url: `https://video.bunnycdn.com/library/${libraryId}/videos/${finalVideoId}`,
                        type: 'PUT',
                        headers: { "AccessKey": accessKey },
                        data: file,
                        processData: false,
                        contentType: "application/octet-stream",
                        xhr: function () {
                            const xhr = new window.XMLHttpRequest();
                            xhr.upload.addEventListener("progress", function (evt) {
                                if (evt.lengthComputable) {
                                    let percentComplete = Math.round((evt.loaded / evt.total) * 100);
                                    progressBar.css('width', percentComplete + '%');
                                    progressBar.text(percentComplete + '%');
                                }
                            }, false);
                            return xhr;
                        }
                    });

                    statusText.html('<i class="bi bi-check-all"></i> Hoàn tất').removeClass('text-primary').addClass('text-success');
                    progressBar.removeClass('progress-bar-animated progress-bar-striped');
                    row.removeData('raw-file'); 
                }
            }

            // ==========================================
            // 📍 GIAI ĐOẠN 2: CHUẨN BỊ MẢNG JSON ĐỂ LƯU
            // ==========================================
            const title = row.find('.lesson-title').val();
            const order = row.find('.lesson-order').val();
            debugger
            const durationSeconds = row.find('.lesson-duration').val() || row.data('duration') || 0;
            const isPreview = row.find('.lesson-preview').is(':checked');
            
            if (title && finalVideoId) {
                lessons.push({
                    chapterId: parseInt(Lesson.currentChapterId),
                    title: title,
                    videoId: finalVideoId,
                    provider: provider,
                    duration: parseInt(durationSeconds),
                    orderIndex: parseInt(order),
                    isPreview: isPreview,
                    courseModelId: Lesson.currentCourseId
                });
            }
        }

        if (lessons.length === 0) {
            Toast1.fire({ icon: 'warning', title: 'Không có bài học nào hợp lệ để lưu!' });
            // Mở khóa lại nếu có lỗi validate để người dùng sửa
            $('#tblBulkLessons').find('input, select, button').prop('disabled', false);
            return;
        }

        // ==========================================
        // 📍 GIAI ĐOẠN 3: GỬI MẢNG JSON LÊN BACKEND C#
        // ==========================================
        GlobalLoader.show(); 

        await $.ajax({
            url: `${Lesson.config.apiUrl}/bulk`,
            type: 'POST',
            contentType: 'application/json',
            headers: { 
                "Authorization": "Bearer " + token 
            },
            data: JSON.stringify(lessons)
        });

        Toast1.fire({ icon: 'success', title: 'Đã lưu toàn bộ bài học thành công!' });
        $('#lessonModal').modal('hide');
        Lesson.loadData(); 

    } catch (e) {
        console.error("Lỗi:", e);
        if (e.status === 401) {
            Toast1.fire({ icon: 'error', title: 'Phiên làm việc hết hạn hoặc bác không có quyền Admin/Teacher!' });
        } else {
            Toast1.fire({ icon: 'error', title: 'Có lỗi trong quá trình upload hoặc lưu dữ liệu!' });
        }
    } finally {
        $('#btnSaveBulk').prop('disabled', false).html('<i class="bi bi-cloud-arrow-up me-1"></i> Lưu tất cả bài học');
        
        // 🚩 THÊM DÒNG NÀY ĐỂ MỞ KHÓA LẠI FORM (NẾU CÓ LỖI HOẶC UPLOAD XONG)
        $('#tblBulkLessons').find('input, select, button').prop('disabled', false);
        
        GlobalLoader.hide();
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
        TableLoader.show('#mainLessonBody');
   try {
       const token = localStorage.getItem("jwt_token");

        const res = await $.ajax({
            url: `${apiUrl}/list-data?${params.toString()}`,
            type: 'GET',
            // 📍 2. Kẹp thẳng Token vào Headers (nếu không dùng auth.js)
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (res.success || res.Success) {
            debugger
            Lesson.currentCourseId = res.courseId;
            Lesson.lessontrash.currentCourseId= res.courseId;
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
// 🎯 Đổi thành async function và nhận thêm tham số lessonId
renderVideo: async function(iframeId, videoId, provider = "YouTube", lessonId = null) {
    const iframe = $(`#${iframeId}`);
    const placeholder = iframe.siblings('.video-placeholder');
    const id = videoId ? videoId.trim() : ""; 

    // Reset trạng thái
    iframe.attr('src', '').addClass('d-none');
    placeholder.removeClass('d-none');

    if (!id) return;

    // Kiểm tra xem là Bunny hay YouTube (viết thường để so sánh cho an toàn)
    if (provider?.toLowerCase() === "bunny") {
        if (!lessonId) {
            console.error("❌ Không có lessonId để lấy link bảo mật Bunny!");
            return;
        }

        try {
            const token = localStorage.getItem("jwt_token");
            
            // Gọi API lấy link mã hóa từ Backend
            const response = await fetch(`https://lms-u2jn.onrender.com/api/Lesson/${lessonId}/secure-video-url`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Lỗi lấy token bảo mật từ Backend");
            
            const data = await response.json();
            
            if (data.secureUrl) {
                // Nối thêm cấu hình giao diện cho Modal Admin
                const embedUrl = `${data.secureUrl}&autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
                
                placeholder.addClass('d-none');
                iframe.attr('src', embedUrl).removeClass('d-none');
            }
        } catch (error) {
            console.error("❌ Lỗi load video Bunny Modal:", error);
            Toast1.fire({ icon: 'error', title: "Không tải được video bảo mật!" });
        }
    } else {
        // Mặc định là YouTube - Vẫn giữ nguyên logic cũ của bác
        setTimeout(() => {
            const cleanId = Lesson.extractVideoId(id);
            const origin = window.location.origin;
            const embedUrl = `https://www.youtube.com/embed/${cleanId}?origin=${origin}&enablejsapi=1&rel=0&autoplay=0`;

            placeholder.addClass('d-none');
            iframe.attr('src', embedUrl).removeClass('d-none'); 
        }, 200);
    }
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

    // 0. LẤY ROLE CỦA NGƯỜI DÙNG HIỆN TẠI
    let currentRole = 0; 
    const userInfoRaw = localStorage.getItem("user_info");
    if (userInfoRaw) {
        const user = JSON.parse(userInfoRaw);
        currentRole = parseInt(user.role);
    }

    // Duyệt qua từng bài học để vẽ dòng (row)
    data.forEach((item, index) => {
        // 1. KIỂM TRA NIÊM PHONG (CHỈ CHECK LOCKED VÌ CHƯA BỊ XÓA)
        const isLockedByAdmin = item.lockedByRole === 'Admin' || item.lockedByRole === '1';
        const isBlockedForTeacher = currentRole !== 1 && isLockedByAdmin;

        let statusHtml = '';
        if (isBlockedForTeacher) {
            // Nếu bị Admin khóa -> Hiện chữ NIÊM PHONG, cấm click đổi trạng thái
            statusHtml = `<span class="badge bg-danger-subtle text-danger border border-danger px-2" 
                                style="cursor: not-allowed;" 
                                onclick="Swal.fire({icon: 'error', title: 'Bị chặn', text: 'Bài học này đang bị Admin niêm phong, không thể đổi trạng thái!'})">
                            <i class="bi bi-lock-fill me-1" style="font-size: 0.5rem;"></i>Niêm phong
                        </span>`;
        } else {
            // Trạng thái bình thường -> Bấm đổi trạng thái
            const statusClass = item.isActive 
                ? 'bg-success-subtle text-success border-success' 
                : 'bg-secondary-subtle text-secondary border-secondary';
            const statusText = item.isActive ? 'Hoạt động' : 'Tạm ẩn';
            
            statusHtml = `<span class="badge ${statusClass} border px-2 user-select-none" 
                                style="cursor: pointer; transition: all 0.2s;" 
                                onclick="Lesson.changeStatus(${item.id})" 
                                title="Nhấn để đổi trạng thái">
                            <i class="bi bi-circle-fill me-1" style="font-size: 0.5rem;"></i>${statusText}
                        </span>`;
        }

        // 3. Xử lý Badge Học thử
        const previewBadge = item.isPreview 
            ? '<span class="badge bg-info-subtle text-info border border-info ms-2" style="font-size: 0.65rem;">HỌC THỬ</span>' 
            : '';

        // 4. Xử lý định dạng thời gian
        const formattedTime = item.formattedDuration || (item.duration + 's');

        // 5. XỬ LÝ NÚT BẤM DỰA TRÊN QUYỀN
        let actionButtons = '';
        if (isBlockedForTeacher) {
            // Bị niêm phong -> Xem, Sửa OK. Chặn XÓA.
            actionButtons = `
                <button class="btn btn-sm btn-white border" onclick="Lesson.openDetailModal(${item.id})" title="Xem chi tiết">
                    <i class="bi bi-eye text-info"></i>
                </button>
                <button class="btn btn-sm btn-white border" onclick="Lesson.openUpdateModal(${item.id})" title="Sửa bài học">
                    <i class="bi bi-pencil-square text-primary"></i>
                </button>
                <button class="btn btn-sm btn-light border text-muted opacity-50" style="cursor: not-allowed;" 
                        onclick="Swal.fire({icon: 'error', title: 'Bị chặn', text: 'Bài học này đang bị Admin niêm phong, không thể xóa!'})" title="Xóa bài học (Khóa)">
                    <i class="bi bi-trash"></i>
                </button>
            `;
        } else {
            // Bình thường
            actionButtons = `
                <button class="btn btn-sm btn-white border" onclick="Lesson.openDetailModal(${item.id})" title="Xem chi tiết">
                    <i class="bi bi-eye text-info"></i>
                </button>
                <button class="btn btn-sm btn-white border" onclick="Lesson.openUpdateModal(${item.id})" title="Sửa bài học">
                    <i class="bi bi-pencil-square text-primary"></i>
                </button>
                <button class="btn btn-sm btn-white border text-danger" onclick="Lesson.delete(${item.id})" title="Xóa bài học">
                    <i class="bi bi-trash"></i>
                </button>
            `;
        }

        html += `
            <tr class="align-middle text-center" data-id="${item.id}">
                <td class="ps-4">
                    ${isBlockedForTeacher 
                        ? '<i class="bi bi-dash text-muted"></i>' 
                        : `<input class="form-check-input item-check" type="checkbox" value="${item.id}">`}
                </td>
                
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
    <div class="d-flex flex-column align-items-start">
        <span class="badge bg-white border mb-1" style="font-size: 0.7rem; color: #333;">
            ${item.provider?.toLowerCase() === 'bunny' 
                ? '<i class="bi bi-play-btn-fill me-1" style="color: #ff6600;"></i>Bunny' 
                : '<i class="bi bi-youtube me-1 text-danger"></i>YouTube'}
        </span>
        <code class="text-muted small font-monospace">${item.videoId}</code>
    </div>
</td>
                <td>
                    <span class="badge bg-light text-dark border fw-normal">
                        <i class="bi bi-clock me-1 text-primary"></i>${formattedTime}
                    </span>
                </td>

                <td>${statusHtml}</td>

                <td style="width: 150px;">
                    <div class="btn-group shadow-sm" style="border-radius: 8px; overflow: hidden;">
                        ${actionButtons}
                    </div>
                </td>
            </tr>`;
    });

    $('#mainLessonBody').html(html);
    Lesson.initSortable();
},
changeStatus: async function(id) {
    try {
        // Bật loading để chống click đúp liên tục
        GlobalLoader.show();
        
        // Lấy Token
        const token = localStorage.getItem("jwt_token");

        // Gọi API Đổi trạng thái (Đảm bảo URL khớp với Controller C#)
        const res = await $.ajax({
            url: `${Lesson.config.apiUrl}/change-status/${id}`, 
            type: "POST", // Hàm C# nãy em viết là HttpPost
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        // Báo thành công (Có thể dùng Toast hoặc Toast1 tùy file js của bác)
        Toast1.fire({ 
            icon: 'success', 
            title: res.Message || res.message || "Đã đổi trạng thái thành công!" 
        });

        // Reload lại bảng để giao diện cập nhật màu sắc mới
        Lesson.loadData();

    } catch (error) {
        console.error("Lỗi đổi trạng thái:", error);
        // Bắt lỗi từ Backend đẩy lên
        const errorMsg = error.responseJSON?.Message || error.responseJSON?.message || "Không thể thay đổi trạng thái lúc này.";
        Toast1.fire({ icon: 'error', title: errorMsg });
    } finally {
        GlobalLoader.hide();
    }
},
openDetailModal: async function (id) {
    // 1. Mở modal
    $('#modalViewLesson').modal('show');
    $('#viewVideoPlayer').attr('src', ''); 
    $('.video-placeholder').removeClass('d-none');

    try {
        const token = localStorage.getItem("jwt_token");

        // 📍 Dùng $.ajax (Nó tự parse JSON rồi, kết quả là biến 'item' hoặc 'res')
        const item = await $.ajax({
            url: `https://lms-u2jn.onrender.com/api/Lesson/${id}`,
            type: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        // ❌ Xóa dòng này đi: const item = await response.json(); 
        
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
        Lesson.renderVideo('viewVideoPlayer', item.videoId, item.provider, id);

    } catch (err) {
        console.error("Lỗi:", err);
        // 📍 Sửa lại cách gọi Toast
        Toast1.fire({ icon: 'error', title: "Lỗi tải chi tiết rồi!" });
        $('#modalViewLesson').modal('hide');
    }
},
goToTrash: function() {
    if (!this.currentChapterId || this.currentChapterId == 0) {
        Swal.fire("Lỗi", "Không xác định được chapter!", "error");
        return;
    }

    // 🚩 Bổ sung thêm courseId vào URL ở đây
    const cId = this.currentCourseId || 0; 
    
    // Ghép cả chapterId và courseId vào link
    window.location.href = `/lesson/lesson_trash.html?chapterId=${this.currentChapterId}&courseId=${cId}`;
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
            handle: '.drag-handle', 
            animation: 150,
            ghostClass: 'bg-light', 
            onEnd: async function() {
                const sortedIds = [];
                $('#mainLessonBody tr').each(function() {
                    const id = $(this).data('id');
                    if (id) sortedIds.push(parseInt(id));
                });

                await Lesson.saveNewOrder(sortedIds);
            }
        });
    },

  saveNewOrder: async function(ids) {
        try {
            GlobalLoader.show(); 

            // 📍 1. Lấy token thủ công từ kho ra
            const token = localStorage.getItem("jwt_token");

            const response = await $.ajax({
                url: `${this.config.apiUrl}/update-order`,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(ids),
                // 📍 2. Kẹp token vào Headers ở đây để qua chốt bảo vệ C#
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            Toast1.fire({ icon: 'success', title: response.message || 'Đã cập nhật thứ tự bài học!' });
            Lesson.loadData();
            
        } catch (err) {
            console.error("Lỗi khi lưu thứ tự:", err);
            let errorMsg = 'Không lưu được thứ tự mới!';
            if (err.status === 401) {
                errorMsg = 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ!';
            } else if (err.responseJSON && err.responseJSON.message) {
                errorMsg = err.responseJSON.message;
            }
            Toast1.fire({ icon: 'error', title: errorMsg });
        } finally {
            GlobalLoader.hide();
        }
    },
// openUpdateLessonModal: async function(id) {
//     try {
//         const response = await fetch(`${this.config.apiUrl}/${id}`);
//         if (!response.ok) throw new Error('Không lấy được dữ liệu');
//         ;
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
                GlobalLoader.show();
                const token = localStorage.getItem("jwt_token");
                const res = await $.ajax({
                    url: `${Lesson.config.apiUrl}/${id}`,
                    type: "DELETE",
                    headers: {
                    "Authorization": "Bearer " + token
                }
                });
                Toast1.fire({ icon: 'success', title: res.message || "Đã xóa bài học thành công." });
                Lesson.loadData();
            } catch (error) {
                console.error(error);
                Toast1.fire({ icon: 'error', title: "Không thể xóa bản ghi này." });
            } finally {
                GlobalLoader.hide();
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
    formData.set('IsActive', $('#txtIsActive').is(':checked'));

    try {
        // ĐỒNG BỘ CAO CẤP: Dùng chung GlobalLoader khóa màn hình mượt mà
        GlobalLoader.show();
        $('#btnSave').prop('disabled', true);

        // 📍 1. Lấy Token từ kho ra
        const token = localStorage.getItem("jwt_token");

        const response = await $.ajax({
            url: Lesson.config.apiUrl,
            type: 'POST',
            data: formData,
            processData: false, 
            contentType: false,  
            // 📍 2. Nhét vé thông hành vào Headers
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        Toast1.fire({ icon: 'success', title: response.message || "Đã thêm bài học thành công" });
        $('#LessonModal').modal('hide');
        Lesson.loadData();
        form.reset();
        $('#imgPreview').hide();
    } catch (error) {
        console.error("Lỗi thêm bài học:", error);
        
        // Bắt lỗi chi tiết hiển thị cho mượt
        let errorMsg = 'Lỗi không thêm được bài học!';
        if (error.status === 401) {
            errorMsg = 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!';
        } else if (error.responseJSON && error.responseJSON.message) {
            errorMsg = error.responseJSON.message; // Bắt lỗi validate từ Backend
        }
        
        Toast1.fire({ icon: 'error', title: errorMsg });
    } finally {
        $('#btnSave').prop('disabled', false);
        GlobalLoader.hide();
    }
},
    openUpdateModal: async function(id) {
    try {
       const token = localStorage.getItem("jwt_token");

        // 📍 2. Chuyển sang $.ajax và kẹp vé vào Headers
        const res = await $.ajax({
            url: `${Lesson.config.apiUrl}/${id}`,
            type: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
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
        Lesson.renderVideo('editVideoPreview',item.videoId, item.provider, id);
        $('#modalEditLesson').modal('show');
    } catch (error) {
        console.error("Lỗi khi load dữ liệu sửa:", error);
        Toast1.error("Có lỗi xảy ra: " + (error.message || "Không rõ nguyên nhân"));
    }
},
  softDeleteBulk: function() {
        const ids = $('.item-check:checked').map(function() { 
            return parseInt($(this).val()); 
        }).get();
        
        if (ids.length === 0) return;

        Swal.fire({
            title: `Xóa ${ids.length} bài học?`,
            text: "Các bài học này sẽ được chuyển vào thùng rác!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Đồng ý xóa',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    GlobalLoader.show();
                    const response = await fetch(`${Lesson.config.apiUrl}/soft-delete-bulk`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + localStorage.getItem("jwt_token")
                        },
                        body: JSON.stringify(ids)
                    });
                    
                    const res = await response.json();
                    if (!response.ok) throw new Error(res.message || 'Lỗi từ server');

                    const isSuccess = res.Success || res.success;
                    if (isSuccess) {
                        Toast1.fire({ icon: 'success', title: res.message || 'Đã chuyển các mục vào thùng rác!' });
                        Lesson.uncheckAll(); 
                        Lesson.loadData(); 
                    } else {
                        Toast1.fire({ icon: 'error', title: res.message || 'Có lỗi xảy ra' });
                    }
                } catch (error) {
                    console.error(error);
                    Toast1.fire({ icon: 'error', title: `Lỗi: ${error.message}` });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },
update: async function() {
    const id = $('#editLessonId').val(); 
    var form = $('#formEditLesson')[0];
    var formData = new FormData(form); 
    formData.set('IsActive', $('#editIsActive').is(':checked'));
    
    const videoId = Lesson.extractVideoId($('#editVideoId').val());
    const durationSeconds = $('#editDuration').val() || 0;
    formData.set("VideoId", videoId);
    formData.set("Duration", durationSeconds);

    try {
        GlobalLoader.show();

        // 📍 Nhét Token vào Headers cho hàm PUT
        const token = localStorage.getItem("jwt_token");

        await $.ajax({
            url: `${Lesson.config.apiUrl}/${id}`, 
            type: 'PUT',
            data: formData,
            processData: false,
            contentType: false,
            headers: { "Authorization": `Bearer ${token}` }
        });

        Toast1.fire({ icon: 'success', title: 'Cập nhật thông tin bài học thành công!' });
        $('#modalEditLesson').modal('hide');
        Lesson.loadData();
    } catch (error) {
        console.error(error);
        let errorDetail = error.responseJSON?.errors 
                          ? Object.values(error.responseJSON.errors).flatMap(x => x).join("<br>")
                          : "Cập nhật dữ liệu thất bại!";
        Toast.fire({ icon: 'error', title: errorDetail });
    } finally {
        GlobalLoader.hide();
    }
},detail: async function(id) {
    try {
        // 📍 Chuyển sang $.ajax và kẹp Token để qua ải 401
        const token = localStorage.getItem("jwt_token");
        const res = await $.ajax({
            url: `${this.config.apiUrl}/${id}`,
            type: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });

        const item = res.data || res;      
        $('#dtlId').text(item.lessonId); // Lưu ý: Bác kiểm tra xem backend trả về LessonId hay Id nhé
        $('#dtlCategory').text(item.categoryName);
        $('#dtlName').text(item.name);
        $('#dtlDescription').text(item.description || 'Chưa có mô tả.');
        
        // Hiển thị giá
        if (item.price === 0) {
            $('#dtlPrice').html('<span class="text-success">Miễn phí</span>');
        } else {
            const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price);
            $('#dtlPrice').text(formattedPrice);
        }
        
        let thumb = item.thumbnailUrl || "https://placehold.co/600x400?text=No+Image";
        $('#dtlThumbnail').attr('src', thumb);
        $('#dtlCreatedAt').text(new Date(item.createAt).toLocaleString('vi-VN'));
        
        const statusHtml = item.isActive 
            ? '<span class="badge bg-success">Hoạt động</span>' 
            : '<span class="badge bg-danger">Đang khóa</span>';
        $('#dtlStatusBadge').html(statusHtml);
        
        $('#detailLessonModal').modal('show');    
    } catch (error) {
        console.error("Lỗi khi xem chi tiết:", error);
        alert("Có lỗi xảy ra: " + (error.responseJSON?.message || "Không lấy được dữ liệu!"));
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
},
lessontrash: {
    currentCourseId : 0,
    init: function() {
         const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('chapterId');

        if (id) {
            Lesson.currentChapterId = id; // Gán lại vào biến global để dùng
            Lesson.registerCheckboxEvents();
            this.loadData(1);
        } else {
            console.error("URL thiếu chapterId!");
        }
    },
resetFilter: function() {
    // 1. Reset ô tìm kiếm về rỗng
    $('#trashKeySearch').val('');
    
    // 2. Reset select danh mục về giá trị mặc định (0)
    $('#trashFilterCategory').val('0');
    
    // 3. Gọi lại hàm loadData để lấy lại toàn bộ danh sách ban đầu (trang 1)
    this.loadData(1);
},
restoreBulk: function() {
    const ids = this.getSelectedIds();
    if (ids.length === 0) return;

    Swal.fire({
        title: `Khôi phục ${ids.length} bài học?`,
        text: "Các bài học được chọn sẽ hoạt động trở lại bình thường.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#1976d2',
        confirmButtonText: 'Đồng ý khôi phục',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`${Lesson.config.apiUrl}/restore-bulk`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem("jwt_token") // Thêm token nếu cần
                    },
                    body: JSON.stringify(ids)
                });

                const res = await response.json();
                const isSuccess = res.success || res.Success;
                const apiMessage = res.message || res.Message;

                if (isSuccess) {
                    Toast1.fire({ 
                        icon: 'success', 
                        title: apiMessage || `Đã khôi phục thành công ${ids.length} bài học.` 
                    });
                    Lesson.uncheckAll(); 
                    this.loadData(1);    
                } else {
                    // Hiển thị lỗi trực tiếp từ Backend
                    Toast1.fire('Thất bại!', apiMessage || 'Có lỗi xảy ra.', 'error');
                }
            } catch (error) {
                console.error("Lỗi restore hàng loạt:", error);
                Toast1.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        }
    });
},
   loadData: async function(page) {
    if (typeof TableLoader !== 'undefined') TableLoader.show('#lessonTrashData');
    
    const keySearch = $('#trashKeySearch').val() || "";
    const isPreview = $('#trashIsPreview').val();
    const pageSize = Lesson.config.pageSize || 10;
    
    const params = new URLSearchParams({
        chapterId: Lesson.currentChapterId,
        page: page,
        pageSize: pageSize,
        keySearch: keySearch,
        isPreview: isPreview
    });

    try {
        // 📍 1. Lấy Token từ kho ra (vì trang này không nhúng auth.js)
        const token = localStorage.getItem("jwt_token");

        // 📍 2. Chuyển sang $.ajax để tự động kẹp vé thông hành
        const res = await $.ajax({
            url: `${Lesson.config.apiUrl}/list-deleted?${params.toString()}`,
            type: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        // $.ajax tự động xử lý JSON rồi, chỉ cần check dữ liệu
        if (res.success || res.Success) {
            this.renderTable(res.data || res.Data);
            
            const total = res.total || res.Total || res.totalCount || 0;
            this.showPaging(total, page);
            
            const totalEl = document.getElementById('total-records');
            if (totalEl) totalEl.innerText = total;
        }
    } catch (error) {
        console.error("Lỗi load thùng rác bài học:", error);
        
        // Xử lý lỗi 401 nếu Token hết hạn
        if (error.status === 401) {
            console.warn("Phiên đăng nhập hết hạn, vui lòng login lại.");
        }
    } 
},

   renderTable: function(data, currentRole) {
    const tbody = document.getElementById('lessonTrashData');
    if (!tbody) return;

    let html = '';
    
    // Cập nhật colspan = 9 cho khớp với thead
    if (!data || data.length === 0) {
        html = '<tr><td colspan="9" class="text-center py-5 text-muted">Thùng rác bài học trống</td></tr>';
    } else {
        // Đảm bảo lấy đúng Role, nếu không truyền vào thì mặc định lấy từ localStorage
        let roleId = currentRole;
        if (roleId === undefined) {
            const userInfoRaw = localStorage.getItem("user_info");
            roleId = userInfoRaw ? parseInt(JSON.parse(userInfoRaw).role) : 0;
        }

        data.forEach((item, index) => {
            // 1. KIỂM TRA QUYỀN (Khóa nếu Admin xóa/niêm phong)
            const isDeletedByAdmin = item.deletedByRole === 'Admin' || item.lockedByRole === 'Admin' || item.deletedByRole === '1';
            const isBlockedForTeacher = roleId !== 1 && isDeletedByAdmin;

            // 2. Render Checkbox (Khóa thì không cho tick)
            const checkboxHtml = isBlockedForTeacher 
                ? '<i class="bi bi-dash text-muted"></i>' 
                : `<input class="form-check-input item-check" type="checkbox" value="${item.id}">`;

            // 3. Render Trạng thái (Cột bị thiếu của bác)
            const statusHtml = isDeletedByAdmin
                ? '<span class="badge bg-danger-subtle text-danger border border-danger px-2"><i class="bi bi-shield-lock-fill me-1"></i>Admin Xóa</span>'
                : '<span class="badge bg-secondary-subtle text-secondary border border-secondary px-2">Đã xóa mềm</span>';

            // 4. Render Nút Hành động
            let actionButtons = '';
            if (isBlockedForTeacher) {
                actionButtons = `
                    <button class="btn btn-secondary btn-sm opacity-50" style="cursor: not-allowed;"
                            onclick="Swal.fire({icon: 'error', title: 'Bị chặn', text: 'Bài học này do Admin xóa vì vi phạm, bạn không thể can thiệp!'})" 
                            title="Khóa bởi Admin">
                        <i class="bi bi-shield-lock-fill"></i>
                    </button>
                `;
            } else {
                actionButtons = `
                    <button class="btn btn-success btn-sm" title="Khôi phục" 
                            onclick="Lesson.lessontrash.restore(${item.id})">
                        <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" title="Xóa vĩnh viễn" 
                            onclick="Lesson.lessontrash.hardDelete(${item.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
            }

            html += `
            <tr class="align-middle">
                <td class="ps-4">${checkboxHtml}</td>
                
                <td class="text-muted text-center">${item.id}</td>
                
                <td class="ps-3">
                    <div class="fw-bold text-dark">${item.title}</div>
                    <small class="text-muted">Thứ tự: ${item.orderIndex}</small>
                </td>
                
                <td>
                    <div class="chapter-name">
                        <i class="bi bi-folder2 me-1"></i>${item.chapterName || 'N/A'}
                    </div>
                </td>
                
                <td>
                    <span class="video-id-badge">ID: ${item.videoId || '---'}</span>
                    <div class="small text-primary">${item.provider || ''}</div>
                </td>
                
                <td>
                    <span class="text-dark"><i class="bi bi-clock me-1"></i>${item.formattedDuration || '00:00'}</span>
                </td>
                
                <td>${statusHtml}</td>
                
                <td>
                    <span class="badge ${item.isPreview ? 'bg-info-subtle text-info border border-info' : 'bg-light text-muted border'}">
                        ${item.isPreview ? 'Cho phép' : 'Không'}
                    </span>
                </td>
                
                <td class="text-center text-nowrap pe-4">
                    <div class="btn-group shadow-sm">
                        ${actionButtons}
                    </div>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;
},
  restore: function(id) {
        Swal.fire({
            title: 'Khôi phục bài học?',
            text: "Bài học sẽ hiển thị lại trong chương tương ứng.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Khôi phục',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH BẢO VỆ TIẾN TRÌNH KHÔI PHỤC
                    GlobalLoader.show();

                    const token = localStorage.getItem("jwt_token");
                    const response = await fetch(`${Lesson.config.apiUrl}/restore/${id}`, { 
                        method: 'POST',
                        headers: { "Authorization": "Bearer " + token }
                    });
                    const res = await response.json();
                    
                    if (res.success || res.Success) {
                        Toast1.fire({ icon: 'success', title: 'Đã khôi phục bài học thành công.' });
                        this.loadData(1);
                    } else {
                        Toast1.fire({ icon: 'error', title: res.message || 'Có lỗi xảy ra' });
                    }
                } catch (e) { 
                    console.error(e);
                    Toast1.fire({ icon: 'error', title: 'Lỗi kết nối máy chủ.' });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },

    hardDelete: function(id) {
        Swal.fire({
            title: 'Xóa vĩnh viễn bài học?',
            text: "Hành động này không thể hoàn tác, dữ liệu liên quan sẽ bị xóa sạch!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xóa vĩnh viễn',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH BẢO VỆ TIẾN TRÌNH XÓA VĨNH VIỄN
                    GlobalLoader.show();

                    const token = localStorage.getItem("jwt_token");
                    const response = await fetch(`${Lesson.config.apiUrl}/hard-delete/${id}`, { 
                        method: 'DELETE',
                        headers: { "Authorization": "Bearer " + token }
                    });
                    const res = await response.json();
                    
                    if (res.success || res.Success) {
                        Toast1.fire({ icon: 'success', title: 'Bài học đã bị loại bỏ hoàn toàn.' });
                        this.loadData(1);
                    } else {
                        Toast1.fire({ icon: 'error', title: res.message || 'Không thể xóa bài học này.' });
                    }
                } catch (e) { 
                    console.error(e);
                    Toast1.fire({ icon: 'error', title: 'Lỗi kết nối máy chủ.' });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },

    restoreBulk: function() {
        const ids = this.getSelectedIds();
        if (ids.length === 0) return;

        Swal.fire({
            title: `Khôi phục ${ids.length} bài học?`,
            text: "Các bài học được chọn sẽ hoạt động trở lại bình thường.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1976d2',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Đồng ý khôi phục',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH KHÔI PHỤC HÀNG LOẠT
                    GlobalLoader.show();

                    const response = await fetch(`${Lesson.config.apiUrl}/restore-bulk`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + localStorage.getItem("jwt_token")
                        },
                        body: JSON.stringify(ids)
                    });

                    const res = await response.json();
                    const isSuccess = res.success || res.Success;

                    if (isSuccess) {
                        Toast1.fire({ 
                            icon: 'success', 
                            title: res.message || `Đã khôi phục thành công ${ids.length} bài học.` 
                        });
                        if (typeof Lesson.uncheckAll === 'function') Lesson.uncheckAll(); 
                        this.loadData(1);    
                    } else {
                        Toast1.fire({ icon: 'error', title: res.message || 'Có lỗi xảy ra.' });
                    }
                } catch (error) {
                    console.error("Lỗi restore hàng loạt:", error);
                    Toast1.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ.' });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },

    deleteBulk: function() {
        const ids = this.getSelectedIds();
        if (ids.length === 0) return;

        Swal.fire({
            title: `Xóa vĩnh viễn ${ids.length} mục?`,
            text: "Dữ liệu bài học sẽ bị xóa sạch hoàn toàn, hành động này không thể hoàn tác!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xóa sạch ngay',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH XÓA VĨ NH VIỄN HÀNG LOẠT
                    GlobalLoader.show();

                    const response = await fetch(`${Lesson.config.apiUrl}/hard-delete-bulk`, {
                        method: 'DELETE', 
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + localStorage.getItem("jwt_token")
                        },
                        body: JSON.stringify(ids)
                    });
                    const res = await response.json();
                    
                    if (res.success || res.Success) {
                        Toast1.fire({ icon: 'success', title: `Đã xóa vĩnh viễn ${ids.length} mục thành công.` });
                        if (typeof Lesson.uncheckAll === 'function') Lesson.uncheckAll(); 
                        this.loadData(1);
                    } else {
                        Toast1.fire({ icon: 'error', title: res.message || 'Có lỗi xảy ra.' });
                    }
                } catch (error) {
                    Toast1.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ.' });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },
    showPaging: function(totalCount, currentPage) {
        const pageSize = Lesson.config.pageSize || 10;
        const totalPages = Math.ceil(totalCount / pageSize);
        
        $('#paging-ul').twbsPagination('destroy');
        if (totalPages > 0) {
            $('#paging-ul').twbsPagination({
                totalPages: totalPages,
                startPage: currentPage,
                visiblePages: 5,
                first: '<<',
                last: '>>',
                next: '>',
                prev: '<',
                onPageClick: (event, page) => { 
                    if (page !== currentPage) this.loadData(page); 
                }
            });
        }
    },
    getSelectedIds: function() {
            return Array.from($('.item-check:checked')).map(cb => parseInt($(cb).val()));
        },
        goBackToLessons: function() {
    const urlParams = new URLSearchParams(window.location.search);
    debugger
    // 2. Bốc chapterId và courseId từ URL (nếu trên URL không có thì mới xài biến dự phòng)
    const chapterId = urlParams.get('chapterId') || Lesson.currentChapterId || "";
    const courseId = urlParams.get('courseId')|| 0;
    
    // 3. Tiến hành ghép chuỗi điều hướng quay lại
    window.location.href = `/lesson/index.html?chapterId=${chapterId}&courseId=${courseId}`;
}
},

};
$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId'); // Lấy được ID từ URL rồi nhé!

    // Nếu có courseId thì cập nhật cho nút Quay lại
    if (courseId) {
        $('#backLink').attr('href', `/course/index.html#manage-chapters-${courseId}`);
    }
});

// Chạy khởi tạo
// $(document).ready(function () {
//     Lesson.init();
//     Lesson.addBulkRow();
// });