
const Toast2 = Swal.mixin({
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
const chapter = {
    currentCourseId: 0, // Lưu ID khóa học đang chọn
    config: {
        pageSize: 10,
        apiUrl: "https://lms-u2jn.onrender.com/api/chapter"
    },
    openModal: async function(courseId) {
        TableLoader.show('#chapterListBody');
        chapter.currentCourseId = courseId;
        
        $('#txtNewChapter').val('');
        $('#chapterModal').modal('show');
        chapter.loadList(courseId);
    },

    loadList: async function(courseId) {
    try {
        // Lấy Token (đề phòng API yêu cầu đăng nhập)
        const token = localStorage.getItem("jwt_token");

        const res = await $.ajax({
            url: `${chapter.config.apiUrl}/course/${courseId}`,
            type: 'GET',
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        // Kéo biến roleId ra ngoài để hứng dữ liệu
        let currentRole = 0; 
        const userInfoRaw = localStorage.getItem("user_info");
        
        if (userInfoRaw) {
            const user = JSON.parse(userInfoRaw);
            currentRole = parseInt(user.role);
        }
        chapter.render(res.data || [], currentRole);

    } catch (error) {
        console.error("Lỗi load chương:", error);
        Toast.fire('Lỗi!', 'Không thể tải danh sách chương học.', 'error');
    }
},
    saveChapter: async function(){
        var title = $('#txtNewChapter').val().trim();
        var courseId = chapter.currentCourseId; 
        if (title === '') {
            alert("Bác chưa nhập tên chương kìa!");
            $('#txtNewChapter').focus();
            return;
        }
        var payload = {
        Title: title,
        CourseId: courseId,
        OrderIndex: 0 
        };
       try {
        GlobalLoader.show();
        // Hiệu ứng chờ (Optional)
        const btn = $('#btnSaveChapter');
        btn.prop('disabled', true).text('Đang lưu...');

        const response = await $.ajax({
            url: chapter.config.apiUrl, 
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });

        $('#txtNewChapter').val(''); 
        chapter.loadList(courseId); 
        
    } catch (error) {
        console.error("Lỗi khi thêm:", error);
        let errorMsg = error.responseJSON?.message || "Không rõ nguyên nhân";
        alert("Có lỗi xảy ra: " + errorMsg);
    } finally {
        $('#btnSaveChapter').prop('disabled', false).html('<i class="bi bi-plus-lg"></i> Thêm ngay');
        GlobalLoader.hide();
    }
    },
    // 3. Hàm đổ dữ liệu vào bảng
  render: function(data, roleId) {
    let html = '';
    
    // Ép kiểu role cho chắc cốp
    const currentRole = parseInt(roleId);

    // 1. Kiểm tra nếu không có dữ liệu
    if (!data || data.length === 0) {
        html = '<tr><td colspan="4" class="text-center text-muted small italic py-4">Chưa có chương nào được tạo.</td></tr>';
    } else {
        // 2. Sắp xếp theo OrderIndex trước khi render
        data.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((item, index) => {
            
            // LOGIC KIỂM TRA QUYỀN
            const isLockedByAdmin = item.lockedByRole === 'Admin';
            const isBlockedForTeacher = currentRole !== 1 && isLockedByAdmin;

            html += `
            <tr data-id="${item.id}" class="${item.isActive ? '' : 'table-light text-muted'}">
                
                <td class="text-center align-middle">
                    ${isBlockedForTeacher 
                        // Nếu bị khóa -> Mất class 'drag-handle', thay bằng icon Ổ khóa màu đỏ
                        ? `<i class="bi bi-lock-fill text-danger" title="Đã bị khóa, không thể di chuyển"></i>` 
                        // Bình thường -> Hiện icon kéo thả
                        : `<i class="bi bi-grip-vertical drag-handle" style="cursor: move; color: #ccc;"></i>`
                    }
                    <span class="ms-1">${index + 1}</span>
                </td>

                <td class="align-middle">
                    <input type="text" class="form-control border-0 bg-transparent fw-bold ${isBlockedForTeacher ? 'text-danger' : ''}" 
                           value="${item.title}" 
                           ${isBlockedForTeacher 
                               ? 'disabled title="Chương này đã bị Admin niêm phong, không thể đổi tên"' 
                               : `onchange="chapter.update(${item.id}, this.value)"`} >
                </td>

                <td class="text-center align-middle">
                    <span role="button" 
                        class="badge rounded-pill ${isLockedByAdmin ? 'bg-danger-subtle text-danger border border-danger' : (item.isActive ? 'bg-success' : 'bg-secondary')} p-2 px-3"
                        style="cursor: ${isBlockedForTeacher ? 'not-allowed' : 'pointer'}; transition: all 0.3s;"
                        onclick="${isBlockedForTeacher 
                            ? "Swal.fire({icon: 'error', title: 'Bị chặn', text: 'Chương này đang bị Admin niêm phong!'})" 
                            : `chapter.changeStatus(${item.id})`}">
                        
                        <i class="bi ${isLockedByAdmin ? 'bi-shield-lock-fill' : (item.isActive ? 'bi-eye-fill' : 'bi-eye-slash-fill')} me-1"></i>
                        ${isLockedByAdmin ? 'Niêm phong' : (item.isActive ? 'Đang hiện' : 'Tạm ẩn')}
                    </span>
                </td>

                <td class="text-end align-middle">
                        <div class="btn-group shadow-sm">
                            
                            <button class="btn btn-sm btn-outline-info" title="Quản lý bài học" 
                                    onclick="Lesson.MapsToLesson(${item.id})">
                                <i class="bi bi-collection-play-fill"></i>
                            </button>
                            
                            <button class="btn btn-sm btn-outline-danger ${isBlockedForTeacher ? 'opacity-50' : ''}" 
                                    title="Xóa chương" 
                                    onclick="${isBlockedForTeacher 
                                        ? "Swal.fire({icon: 'error', title: 'Bị chặn', text: 'Không thể xóa chương đang bị niêm phong!'})" 
                                        : `chapter.delete(${item.id})`}"
                                    ${isBlockedForTeacher ? 'disabled' : ''}>
                                <i class="bi bi-trash"></i>
                            </button>
                            
                        </div>
                </td>
            </tr>`;
        });
    }

    // 3. Đổ HTML vào body của bảng
    $('#chapterListBody').html(html);

    // 4. Kích hoạt kéo thả (SortableJS sẽ chỉ móc vào những icon có class 'drag-handle')
    if (typeof Sortable !== 'undefined' && data.length > 0) {
        chapter.initSortable();
    }
},

initSortable: function() {
    const el = document.getElementById('chapterListBody');
    
    Sortable.create(el, {
        handle: '.drag-handle', 
        animation: 150,        
        ghostClass: 'table-info', 
        onEnd: async () => {
            let sortedIds = [];
            $('#chapterListBody tr').each(function() {
                let id = $(this).data('id');
                if (id) sortedIds.push(id);
            });

            // 2. Gọi hàm gửi danh sách này lên Backend
            await chapter.updateOrder(sortedIds);
        }
    });
},

updateOrder: async function(sortedIds) {
    try {
        GlobalLoader.show();
        
        // 1. Nhớ lấy Token để vượt qua [Authorize] của Backend
        const token = localStorage.getItem("jwt_token");

        // 2. Gửi mảng ID lên server
        const response = await $.ajax({
            url: `${chapter.config.apiUrl}/reorder/${chapter.currentCourseId}`,
            type: 'POST',
            headers: {
                "Authorization": "Bearer " + token
            },
            contentType: 'application/json',
            data: JSON.stringify(sortedIds)
        });

        Toast.fire({
            icon: 'success',
            title: 'Lưu thứ tự chương thành công!'
        });
        
        chapter.loadList(chapter.currentCourseId);

    } catch (error) {
    
        Toast.fire({
            icon: 'error',
            title: 'Lưu thứ tự thất bại! Đang khôi phục vị trí cũ...'
        });
        chapter.loadList(chapter.currentCourseId); 
    }
    finally {
        GlobalLoader.hide();
    }
},
    update: async function(id, newTitle) {
    if (!newTitle.trim()) {
        alert("Tên chương không được để trống bác ơi!");
        chapter.loadList(chapter.currentCourseId); 
        return;
    }
    ;
    try {
        GlobalLoader.show();
        const response = await $.ajax({
            url: `${chapter.config.apiUrl}/${id}`,
            type: 'PUT', 
            contentType: 'application/json',
            data: JSON.stringify({
                id: id,
                title: newTitle,
                courseId: chapter.currentCourseId,
            })
        });
        Toast.fire({ icon: 'success', title: response.message || "Cập nhật chương thành công!" });
    } catch (error) {
        if (error.responseJSON && error.responseJSON.message) {
            errorMsg = error.responseJSON.message; 
        } else if (error.status === 404) {
            errorMsg = "Không tìm thấy chương!";
        }
        Toast.fire({ icon: 'error', title: errorMsg });
        chapter.loadList(chapter.currentCourseId); // Reset lại tên cũ nếu lỗi
    }
    finally {
            GlobalLoader.hide();
        }
},
changeStatus: async function(id) {
    try {
        GlobalLoader.show();
        const response = await $.ajax({
            url: `${chapter.config.apiUrl}/${id}/status`,
            type: 'PUT'
        });
        Toast.fire({ icon: 'success', title: response.message || "Đổi trạng thái thành công" });
        chapter.loadList(chapter.currentCourseId);

    } catch (error) {
        Toast.fire({ icon: 'error', title: "Lỗi đổi trạng thái!" });
    }
    finally {
            GlobalLoader.hide();
        }
},
goToTrash: function() {
        if (!this.currentCourseId || this.currentCourseId == 0) {
            Swal.fire("Lỗi", "Không xác định được khóa học!", "error");
            return;
        }
        // Chuyển hướng kèm theo tham số courseId trên URL
        window.location.href = `/chapter/chapter_trash.html?courseId=${this.currentCourseId}`;
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
            GlobalLoader.show();
            const res = await $.ajax({
                url: `${chapter.config.apiUrl}/${id}`,
                type: "DELETE"
            });
            Toast.fire({ icon: 'success', title: res.message || "Đã xóa chương." });
            chapter.loadList(this.currentCourseId);

        } catch (error) {
            Toast.fire({ icon: 'error', title: "Không thể xóa bản ghi này." });
        }
        finally {
                GlobalLoader.hide();
            }
    }
},
chapterTrash: {
    init: function() {
        const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('courseId');

        if (id) {
            chapter.currentCourseId = id; // Gán lại vào biến global để dùng
            this.loadData(1);
        } else {
            console.error("URL thiếu courseId!");
        }
    },

   loadData: async function(page) {
    TableLoader.show('#chapterTrashData');
    const pageSize = 10; 

    const keyword = document.getElementById('chapterTrashKeySearch').value || '';
    const url = `https://lms-u2jn.onrender.com/api/Chapter/list-deleted?courseId=${chapter.currentCourseId}&keyword=${encodeURIComponent(keyword)}&page=${page}&pageSize=${pageSize}`;

    try {
        // Lấy Token gửi kèm
        const token = localStorage.getItem("jwt_token");
        let currentRole = 0; 
        const userInfoRaw = localStorage.getItem("user_info");
        
        if (userInfoRaw) {
            const user = JSON.parse(userInfoRaw);
            currentRole = parseInt(user.role);
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                "Authorization": "Bearer " + token 
            }
        });
        const res = await response.json();

        if (res.success || res.Success) {
            const dataList = res.data || res.Data || [];
            this.renderTable(dataList, currentRole);
            const totalRecords = res.total || res.Total || res.totalCount || 0;
            const totalPages = res.totalPages || Math.ceil(totalRecords / pageSize); 
            this.showPaging(totalPages, page);
            document.getElementById('total-records').innerText = totalRecords;
        }
    } catch (error) {
        console.error("Lỗi load thùng rác chương:", error);
    } finally {
        GlobalLoader.hide('#chapterTrashData'); // Nhớ ẩn loader đi nhé
    }
},
renderTable: function(data, roleId) {
    const tbody = document.getElementById('chapterTrashData');
    if (!tbody) return;

    let html = '';
    
    // Đã bỏ Checkbox nên colspan rút xuống còn 6
    if (!data || data.length === 0) {
        html = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <div class="mb-3">
                        <i class="bi bi-trash3 text-muted" style="font-size: 3rem; opacity: 0.3;"></i>
                    </div>
                    <p class="text-muted fw-light">Thùng rác hiện đang trống sạch sẽ!</p>
                </td>
            </tr>`;
    } else {
        const currentRole = parseInt(roleId);

        data.forEach(item => {
            const dateValue = item.updatedAt;
            const deleteDate = new Date(dateValue).toLocaleDateString('vi-VN');

            // KIỂM TRA QUYỀN
            const isDeletedByAdmin = item.deletedByRole === 'Admin' || item.deletedByRole === '1';
            const isBlockedForTeacher = currentRole !== 1 && isDeletedByAdmin;

            // RENDER NÚT BẤM
            let actionButtons = '';
            if (isBlockedForTeacher) {
                actionButtons = `
                    <button class="btn-action text-secondary opacity-50" style="cursor: not-allowed; border: none; background: transparent;" 
                            onclick="Swal.fire({icon: 'error', title: 'Bị chặn', text: 'Chương này do Admin xóa vì vi phạm, bạn không thể can thiệp!'})" 
                            title="Khóa bởi Admin">
                        <i class="bi bi-shield-lock-fill fs-5"></i>
                    </button>
                `;
            } else {
                actionButtons = `
                    <button class="btn-action btn-restore text-success" style="border: none; background: transparent;" 
                            onclick="chapter.chapterTrash.restore(${item.id})" title="Khôi phục">
                        <i class="bi bi-arrow-counterclockwise fs-5"></i>
                    </button>
                    <button class="btn-action btn-delete text-danger" style="border: none; background: transparent;" 
                            onclick="chapter.chapterTrash.hardDelete(${item.id})" title="Xóa vĩnh viễn">
                        <i class="bi bi-trash3-fill fs-5"></i>
                    </button>
                `;
            }

            // RENDER BADGE TRẠNG THÁI
            let statusBadge = isDeletedByAdmin 
                ? `<span class="badge bg-danger-subtle text-danger border border-danger">Admin Xóa</span>`
                : `<span class="badge bg-secondary-subtle text-secondary border border-secondary">Đã xóa mềm</span>`;

            html += `
            <tr class="align-middle">
                
                <td class="ps-4" style="width: 80px">
                    <span class="text-muted fw-bold">#${item.id}</span>
                </td>
                
                <td>
                    <div class="d-flex flex-column">
                        <a href="javascript:void(0)" class="text-dark fw-bold text-hover-primary mb-1 fs-6 text-decoration-none">
                            ${item.title}
                        </a>
                        <span class="text-muted fw-semibold fs-7">Chương học</span>
                    </div>
                </td>

                <td>
                    <span class="badge bg-light-info text-info border-0 fw-bold px-3 py-2">
                        STT: ${item.orderIndex || item.order || 0}
                    </span>
                </td>

                <td>${statusBadge}</td>

                <td>
                    <div class="d-flex flex-column">
                        <span class="text-danger fw-bold mb-1">${deleteDate}</span>
                        <span class="text-muted fs-7">Ngày xóa tạm</span>
                    </div>
                </td>

                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        ${actionButtons}
                    </div>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;
},
resetFilter: function() {
    // 1. Tìm ô input và xóa trắng nội dung
    const searchInput = document.getElementById('chapterTrashKeySearch');
    if (searchInput) {
        searchInput.value = '';
    }

    // 2. Gọi lại hàm load dữ liệu, bắt đầu từ trang 1
    this.loadData(1);
},
restore: function(id) {
        Swal.fire({
            title: 'Khôi phục chương học?',
            text: "Chương này sẽ quay lại danh sách hiển thị chính.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Đồng ý khôi phục',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // 3. KHÓA MÀN HÌNH BẢO VỆ TIẾN TRÌNH KHÔI PHỤC CHƯƠNG
                    GlobalLoader.show();

                    const parentObj = (typeof chapter !== 'undefined') ? chapter : Chapter;
                    const token = localStorage.getItem("jwt_token");

                    const response = await fetch(`${parentObj.config.apiUrl}/restore/${id}`, { 
                        method: 'POST',
                        headers: { "Authorization": "Bearer " + token }
                    });
                    const res = await response.json();
                    
                    if (res.success || res.Success) {
                        // ĐỒNG BỘ: Sử dụng Toast thông báo mượt mà góc màn hình
                        Toast2.fire({ icon: 'success', title: 'Chương học đã được khôi phục thành công!' });
                        this.loadData(1);
                    } else {
                        Toast2.fire({ icon: 'error', title: res.message || 'Khôi phục chương học thất bại!' });
                    }
                } catch (err) { 
                    console.error(err);
                    Toast2.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ hệ thống!' });
                } finally {
                    // LUÔN MỞ KHÓA MÀN HÌNH Ở FINALLY
                    GlobalLoader.hide();
                }
            }
        });
    },
        hardDelete: function(id) {
        Swal.fire({
            title: 'Xóa vĩnh viễn chương học?',
            text: "Toàn bộ bài học bên trong chương này sẽ bị phá hủy, hành động này không thể hoàn tác!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xóa sạch ngay',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // 4. KHÓA MÀN HÌNH BẢO VỆ TIẾN TRÌNH PHÁ HỦY VĨNH VIỄN
                    GlobalLoader.show();

                    const parentObj = (typeof chapter !== 'undefined') ? chapter : Chapter;
                    const token = localStorage.getItem("jwt_token");

                    const response = await fetch(`${parentObj.config.apiUrl}/hard-delete/${id}`, { 
                        method: 'DELETE',
                        headers: { "Authorization": "Bearer " + token }
                    });
                    const res = await response.json();
                    
                    if (res.success || res.Success) {
                        Toast2.fire({ icon: 'success', title: 'Chương học đã bị xóa sạch hoàn toàn khỏi DB.' });
                        this.loadData(1);
                    } else {
                        Toast2.fire({ icon: 'error', title: res.message || 'Có lỗi xảy ra hoặc dính ràng buộc dữ liệu bài học.' });
                    }
                } catch (err) { 
                    Toast2.fire({ icon: 'error', title: 'Mất kết nối máy chủ thiết lập.' });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },

    showPaging: function (totalPages, currentPage) {
    if (!totalPages || totalPages <= 1) {
        $('#paging-ul').empty().removeData("twbs-pagination").unbind("page");
        return;
    }
    
    $('#paging-ul').twbsPagination('destroy');
    $('#paging-ul').twbsPagination({
        totalPages: totalPages,
        visiblePages: 5,
        startPage: currentPage,
        first: '«', prev: '‹', next: '›', last: '»',
        onPageClick: (event, page) => { 
            if (page !== currentPage) this.loadData(page); 
        }
    });
}
}
};