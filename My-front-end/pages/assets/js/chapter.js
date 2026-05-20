const chapter = {
    currentCourseId: 0, // Lưu ID khóa học đang chọn
    config: {
        pageSize: 10,
        apiUrl: "https://lms-u2jn.onrender.com/api/chapter"
    },
    openModal: async function(courseId) {
        chapter.currentCourseId = courseId;
        
        $('#txtNewChapter').val('');
        $('#chapterModal').modal('show');
        chapter.loadList(courseId);
    },

    loadList: async function(courseId) {
        try {
            // Giả sử API của bác là /api/course/{id} trả về kèm chapters
            const res = await $.ajax({
                url: `${chapter.config.apiUrl}/course/${courseId}`,
                type: 'GET'
            });

            chapter.render(res.data || []);
        } catch (error) {
            console.error("Lỗi load chương:", error);
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
    }
    },
    // 3. Hàm đổ dữ liệu vào bảng
    render: function(data) {
    let html = '';
    
    // 1. Kiểm tra nếu không có dữ liệu (Cập nhật colspan lên 4)
    if (!data || data.length === 0) {
        html = '<tr><td colspan="4" class="text-center text-muted small italic">Chưa có chương nào được tạo.</td></tr>';
    } else {
        // 2. Sắp xếp theo OrderIndex trước khi render
        data.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((item, index) => {
            html += `
            <tr data-id="${item.id}" class="${item.isActive ? '' : 'table-light text-muted'}">
                <td class="text-center align-middle">
                    <i class="bi bi-grip-vertical drag-handle" style="cursor: move; color: #ccc;"></i>
                    <span class="ms-1">${index + 1}</span>
                </td>

                <td class="align-middle">
                    <input type="text" class="form-control border-0 bg-transparent fw-bold" 
                           value="${item.title}" 
                           onchange="chapter.update(${item.id}, this.value)">
                </td>

                <td class="text-center align-middle">
                    <span role="button" 
                        class="badge rounded-pill ${item.isActive ? 'bg-success' : 'bg-secondary'} p-2 px-3"
                        style="cursor: pointer; transition: all 0.3s;"
                        onclick="chapter.changeStatus(${item.id})">
                        <i class="bi ${item.isActive ? 'bi-eye-fill' : 'bi-eye-slash-fill'} me-1"></i>
                        ${item.isActive ? 'Đang hiện' : 'Tạm ẩn'}
                    </span>
                </td>

                <td class="text-end align-middle">
                        <div class="btn-group shadow-sm">
                                <button class="btn btn-sm btn-outline-info" title="Quản lý bài học" 
                                onclick="Lesson.MapsToLesson(${item.id})">
                            <i class="bi bi-collection-play-fill"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" title="Xóa chương" 
                                onclick="chapter.delete(${item.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        });
    }

    // 3. Đổ HTML vào body của bảng
    $('#chapterListBody').html(html);

    // 4. Kích hoạt kéo thả (Nếu bác đã cài SortableJS)
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
        // Gửi mảng ID (ví dụ: [10, 15, 12...]) lên server
        const response = await $.ajax({
            url: `${chapter.config.apiUrl}/reorder/${chapter.currentCourseId}`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(sortedIds)
        });

        toastr.success(response.message || "Đã cập nhật thứ tự chương!");
        
        chapter.loadList(chapter.currentCourseId);

    } catch (error) {
        console.error("Lỗi sắp xếp:", error);
        toastr.error("Không lưu được thứ tự mới, bác kiểm tra lại nhé!");
        chapter.loadList(this.currentCourseId); // Reset lại vị trí cũ nếu lỗi
    }
},
    update: async function(id, newTitle) {
    if (!newTitle.trim()) {
        alert("Tên chương không được để trống bác ơi!");
        chapter.loadList(chapter.currentCourseId); 
        return;
    }
    debugger;
    try {
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
        toastr.success(response.message || "Cập nhật chương thành công!");
    } catch (error) {
        if (error.responseJSON && error.responseJSON.message) {
            errorMsg = error.responseJSON.message; 
        } else if (error.status === 404) {
            errorMsg = "Không tìm thấy chương!";
        }
        toastr.error(errorMsg);
        chapter.loadList(chapter.currentCourseId); // Reset lại tên cũ nếu lỗi
    }
},
changeStatus: async function(id) {
    try {
        const response = await $.ajax({
            url: `${chapter.config.apiUrl}/${id}/status`,
            type: 'PUT'
        });
        toastr.success(response.message);
        chapter.loadList(chapter.currentCourseId);

    } catch (error) {
        toastr.error("Lỗi hệ thống!");
    }
},
goToTrash: function() {
        if (!this.currentCourseId || this.currentCourseId == 0) {
            Swal.fire("Lỗi", "Không xác định được khóa học!", "error");
            return;
        }
        // Chuyển hướng kèm theo tham số courseId trên URL
        window.location.href = `/pages/chapter/chapter_trash.html?courseId=${this.currentCourseId}`;
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
                url: `${chapter.config.apiUrl}/${id}`,
                type: "DELETE"
            });
            Swal.fire("Thành công!", res.message || "Đã xóa chương.", "success");
            chapter.loadList(this.currentCourseId);

        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            Swal.fire("Lỗi!", "Không thể xóa bản ghi này.", "error");
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
        const pageSize = 10; // Hoặc lấy từ config của bạn
        const url = `https://lms-u2jn.onrender.com/api/Chapter/list-deleted?courseId=${chapter.currentCourseId}&page=${page}&pageSize=${pageSize}`;

        try {
            const response = await fetch(url);
            const res = await response.json();

            if (res.success || res.Success) {
                this.renderTable(res.data || res.Data);
                this.showPaging(res.total || res.Total || res.totalCount, page);
                document.getElementById('total-records').innerText = res.total || res.totalCount || 0;
            }
        } catch (error) {
            console.error("Lỗi load thùng rác chương:", error);
        }
    },

renderTable: function(data) {
    const tbody = document.getElementById('chapterTrashData');
    if (!tbody) return;

    let html = '';
    if (!data || data.length === 0) {
        html = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="mb-3">
                        <i class="bi bi-trash3 text-muted" style="font-size: 3rem; opacity: 0.3;"></i>
                    </div>
                    <p class="text-muted fw-light">Thùng rác hiện đang trống sạch sẽ!</p>
                </td>
            </tr>`;
    } else {
        data.forEach(item => {
            // Xử lý ngày xóa
            const dateValue = item.deletedAt || item.updatedAt || item.createdAt;
            const deleteDate = new Date(dateValue).toLocaleDateString('vi-VN');
            
            // Avatar chữ cái đầu nếu không có ảnh (như phong cách Course)
            const firstChar = item.title ? item.title.charAt(0).toUpperCase() : '?';

            html += `
            <tr class="align-middle">
                <!-- Cột 1: ID -->
                <td class="ps-4" style="width: 80px">
                    <span class="text-muted fw-bold">#${item.id}</span>
                </td>
                
                <!-- Cột 2: Thông tin chính (Thumbnail + Title) -->
                <td>
                    <div class="d-flex align-items-center">
                        <div class="symbol symbol-45px me-3">
                           
                        </div>
                        <div class="d-flex flex-column">
                            <a href="javascript:void(0)" class="text-dark fw-bold text-hover-primary mb-1 fs-6 text-decoration-none">
                                ${item.title}
                            </a>
                            <span class="text-muted fw-semibold fs-7">Chương học</span>
                        </div>
                    </div>
                </td>

                <!-- Cột 3: Thứ tự hiển thị -->
                <td>
                    <span class="badge bg-light-info text-info border-0 fw-bold px-3 py-2">
                        STT: ${item.orderIndex || item.order || 0}
                    </span>
                </td>

                <!-- Cột 4: Ngày xóa -->
                <td>
                    <div class="d-flex flex-column">
                        <span class="text-dark fw-bold mb-1">${deleteDate}</span>
                        <span class="text-muted fs-7">Ngày xóa tạm</span>
                    </div>
                </td>

                <!-- Cột 5: Hành động (Căn giữa hoặc phải tùy thẩm mỹ) -->
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn-action btn-restore" onclick="chapter.chapterTrash.restore(${item.id})" title="Khôi phục">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="chapter.chapterTrash.hardDelete(${item.id})" title="Xóa vĩnh viễn">
                            <i class="bi bi-trash3-fill"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;
    
    // Cập nhật tổng số bản ghi
    const totalElem = document.getElementById('total-records');
    if (totalElem) totalElem.innerText = data.length;
},
restore: function(id) {
            Swal.fire({
                title: 'Khôi phục chương?',
                text: "Chương này sẽ quay lại danh sách hiển thị chính.",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#198754',
                confirmButtonText: 'Đồng ý',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const response = await fetch(`${chapter.config.apiUrl}/restore/${id}`, { method: 'POST' });
                    const res = await response.json();
                    if (res.success || res.Success) {
                        Swal.fire('Thành công!', 'Đã khôi phục chương.', 'success');
                        this.loadData(1);
                    }
                }
            });
        },

        hardDelete: function(id) {
            Swal.fire({
                title: 'Xóa vĩnh viễn?',
                text: "Dữ liệu sẽ bị xóa sạch khỏi hệ thống và không thể khôi phục!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Xóa ngay',
                cancelButtonText: 'Hủy'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const response = await fetch(`${chapter.config.apiUrl}/hard-delete/${id}`, { method: 'DELETE' });
                    const res = await response.json();
                    if (res.success || res.Success) {
                        Swal.fire('Đã xóa!', 'Chương học đã bị xóa vĩnh viễn.', 'success');
                        this.loadData(1);
                    } else {
                        Swal.fire('Thất bại!', res.message || 'Có lỗi xảy ra.', 'error');
                    }
                }
            });
        },

    showPaging: function(totalCount, currentPage) {
        $('#paging-ul').twbsPagination('destroy');
        const totalPages = Math.ceil(totalCount / 10);
        if (totalPages > 0) {
            $('#paging-ul').twbsPagination({
                totalPages: totalPages,
                startPage: currentPage,
                visiblePages: 5,
                onPageClick: (event, page) => { if (page !== currentPage) this.loadData(page); }
            });
        }
    }
}
};