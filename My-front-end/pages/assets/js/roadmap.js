var RoadMap = {
    currentPage : 0,
    config: {
        apiUrl: "https://lms-u2jn.onrender.com/api/roadmap",
        pageSize : 10
    },
    init: function() {
            RoadMap.loadData(1);
        },
        resetFilter: function() {
        $('#keySearch').val('');
        $('#isActiveSearch').val('-1');
        RoadMap.loadData(1);
    },
    loadData: async function(page) {
        const pageSize = RoadMap.config.pageSize; 
        const apiUrl = RoadMap.config.apiUrl;
        const params = new URLSearchParams({
            page: page,
            pageSize: pageSize,
            keySearch: $('#keySearch').val() || '',
            isActive: $('#isActive').val() || -1
        });
        try{

        const response = await fetch(`${apiUrl}/list-data?${params.toString()}`);
        if (!response.ok) throw new Error('Mạng lỗi hoặc Server có vấn đề');
        const res = await response.json();
        console.log("Dữ liệu thực tế từ API:", res);

        // Kiểm tra res.success hoặc res.Success tùy theo Backend trả về

        if (res.success || res.Success) {

            const listData = res.data || res.Data;

            const totalCount = res.total || res.Total;
            const totalPages = Math.ceil(totalCount / pageSize);
            RoadMap.renderTable(listData);
            RoadMap.showPaging(totalCount, totalPages, page);

        }

        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu:", error);
        }
    },

        renderTable: function(data) {
            let html = '';
            if (!data || data.length === 0) {
                html = '<tr><td colspan="5" class="text-center py-5 text-muted">Không tìm thấy lộ trình nào bác ơi!</td></tr>';
            } else {
                data.forEach(item => {
                    html += `
                    <tr>
                        <td class="ps-4"><img src="${item.thumbnailUrl || 'https://via.placeholder.com/100x60'}" class="roadmap-img shadow-sm"></td>
                        <td>
                            <div class="fw-bold text-dark">${item.title}</div>
                            <div class="text-muted small" style="font-size: 0.7rem;">ID: #${item.id}</div>
                        </td>
                        <td class="text-center"><span class="badge rounded-pill bg-primary bg-opacity-10 text-primary px-3">${item.courseCount || 0} khóa</span></td>
                       <td>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" 
                                    style="cursor: pointer;"
                                    ${item.isActive ? 'checked' : ''} 
                                    onchange="RoadMap.changeStatus(${item.id}, this.checked)">
                                <label class="form-check-label small fw-bold ${item.isActive ? 'text-success' : 'text-secondary'}">
                                    ${item.isActive ? 'Đang bật' : 'Đang ẩn'}
                                </label>
                            </div>
                        </td>
                        <td class="text-end pe-4">
                            <div class="btn-group shadow-sm rounded-3">
                                <a href="roadmap-builder.html?id=${item.id}" class="btn btn-white btn-sm border-end"><i class="bi bi-diagram-3 text-primary"></i></a>
                                <button class="btn btn-outline-info btn-sm" onclick="RoadMap.openEditModal(${item.id})">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                                <button class="btn btn-white btn-sm" onclick="RoadMap.delete(${item.id})"><i class="bi bi-trash text-danger"></i></button>
                            </div>
                        </td>
                    </tr>`;
                });
            }
            $('#roadmapBody').html(html);
        },

        // 3. Xử lý Image Preview
       previewImage: function(input) {
    const $img = $('#previewImg');
    const $placeholder = $('#previewPlaceholder');

    // TRƯỜNG HỢP 1: Người dùng chọn File từ máy tính (input là thẻ <input type="file">)
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            $img.attr('src', e.target.result).show(); 
            $placeholder.hide();
        };

        reader.readAsDataURL(file); // Bắt đầu đọc file
        
        $img.on('error', () => { 
            $img.hide(); 
            $placeholder.text('File lỗi bác ơi!').show(); 
        });
    } 
    else if (typeof input === 'string' && input.trim() !== "") {
        $img.attr('src', input).show();
        $placeholder.hide();
        $img.on('error', () => { 
            $img.hide(); 
            $placeholder.text('Lỗi ảnh').show(); 
        });
    } 
    else {
        $img.hide();
        $placeholder.text('Chưa có ảnh').show();
    }
},
        openModal: function(id = null) {
            $('#roadmapForm')[0].reset();
            $('#roadmapId').val(0);
            $('#previewImg').hide();
            $('#previewPlaceholder').show();

            if (id) {
                $('#modalTitle').text('Chỉnh sửa Lộ trình');
                $.get(`${Auth.config.apiUrl}/Roadmap/${id}`, function(res) {
                    $('#roadmapId').val(res.id);
                    $('#title').val(res.title);
                    $('#description').val(res.description);
                    $('#thumbnailUrl').val(res.thumbnailUrl);
                    $('#isActive').prop('checked', res.isActive);
                    Roadmap.previewImage(res.thumbnailUrl);
                });
            } else {
                $('#modalTitle').text('Tạo Lộ trình mới');
            }
            new bootstrap.Modal('#roadmapModal').show();
        },
   add: async function() {
    const btnSave = $('#btnSave');
    const form = $('#roadmapForm');
    const formData = new FormData(form[0]);
    const isActive = $('#txtIsActive').is(':checked'); 
    formData.set('IsActive', isActive);
    Swal.fire({
        title: 'Đang xử lý...',
        text: 'Vui lòng chờ trong giây lát khi hệ thống tải ảnh lên Cloud',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading(); 
        }
    });
    btnSave.prop('disabled', true);

    try {
        const response = await $.ajax({
            url: RoadMap.config.apiUrl, 
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
        });

        Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: response.message || "Dữ liệu đã được lưu an toàn trên Cloud",
            timer: 2000,
            showConfirmButton: false
        });

        $('#roadmapModal').modal('hide'); 
        RoadMap.loadData(1); 

    } catch (error) {
        console.error("Lỗi upload:", error);
    
        Swal.fire({
            icon: 'error',
            title: 'Thất bại!',
            text: error.responseJSON?.message || "Lỗi đường truyền, bác kiểm tra lại nhé!"
        });

    } finally {
        btnSave.prop('disabled', false);
    }
},
openEditModal: async function(id) {
    $('#roadmapForm')[0].reset();
    $('#thumbnailFile').val(''); 
    try {
        const res = await $.get(`${RoadMap.config.apiUrl}/${id}`);
        $('#roadmapId').val(res.id);
        $('#Title').val(res.title);
        $('#description').val(res.description);
        $('#txtIsActive').prop('checked', res.isActive);
        $('#thumbnailUrl').val(res.thumbnailUrl);
    
        if (res.thumbnailUrl) {
            $('#previewImg').attr('src', res.thumbnailUrl).show();
            $('#previewPlaceholder').hide();
        } else {
            $('#previewImg').hide();
            $('#previewPlaceholder').text('Chưa có ảnh').show();
        }

        $('#modalTitle').text('Chỉnh sửa Lộ trình: ' + res.title);
        
        Swal.close();
        $('#roadmapModal').modal('show'); 

    } catch (error) {
        Swal.fire('Lỗi!', 'Không lấy được thông tin lộ trình bác ơi.', 'error');
    }
},
edit: async function() {
    const id = $('#roadmapId').val();
    const formData = new FormData($('#roadmapForm')[0]);
    debugger
    formData.set('IsActive', $('#txtIsActive').is(':checked'));

    Swal.fire({
        title: 'Đang cập nhật...',
        text: 'Hệ thống đang lưu thay đổi',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const response = await $.ajax({
            url: `${RoadMap.config.apiUrl}/${id}`, // URL kèm ID
            type: 'PUT', // Cập nhật dùng PUT
            data: formData,
            processData: false,
            contentType: false,
        });

        Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Đã cập nhật thay đổi', timer: 1500, showConfirmButton: false });
        $('#roadmapModal').modal('hide');
        RoadMap.loadData(1); 
    } catch (error) {
        Swal.fire('Lỗi!', error.responseJSON?.message || "Không thể cập nhật", 'error');
    }
},
save: function() {
    // Nếu Id > 0 thì là đang Sửa, ngược lại là Thêm mới
    const id = parseInt($('#roadmapId').val()) || 0;
    
    if (id > 0) {
        RoadMap.edit();
    } else {
        RoadMap.add();
    }
},
delete: async function(id){
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
                url: `${RoadMap.config.apiUrl}/${id}`,
                type: "DELETE"
            });
            Swal.fire("Thành công!", res.message || "Đã xóa lộ trình.", "success");
            RoadMap.loadData(1);

        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            Swal.fire("Lỗi!", "Không thể xóa bản ghi này.", "error");
        }
    }
},
changeStatus: async function(id) { 
    try {
        const response = await $.ajax({
            url: `${RoadMap.config.apiUrl}/${id}/status`, 
            type: 'PATCH',
        });
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: 'success',
            title: response.message 
        });

        RoadMap.loadData(1); 

    } catch (error) {
        const errorMsg = error.responseJSON?.message || 'Không đổi được trạng thái bác ơi!';
        Swal.fire('Lỗi!', errorMsg, 'error');
        
        RoadMap.loadData(1);
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
                RoadMap.loadData(page); // Gọi lại hàm load dữ liệu của bạn
            }
        }
    });
},
getAllRoadMaps: async function() {
        try {
            // 1. Gọi API (Fix lỗi dấu } dư ở cuối URL của bác)
            const response = await fetch(`${this.config.apiUrl}/get-all`);
            
            if (!response.ok) throw new Error('Mạng lỗi hoặc Server có vấn đề bác ơi');

            const res = await response.json();
            console.log("Dữ liệu thực tế từ API:", res);

            // 2. Kiểm tra success (Hỗ trợ cả chữ hoa và chữ thường từ Backend)
            if (res.success || res.Success) {
                const data = res.data || res.Data || [];
                
                // Cập nhật số lượng lên Badge
                $('#roadmapCount').text(`${data.length} Lộ trình`);
                
                // Vẽ giao diện
                this.render(data);
            } else {
                this.showError(res.message || "Không lấy được dữ liệu.");
            }

        } catch (error) {
            console.error("Lỗi sập nguồn:", error);
            this.showError("Lỗi kết nối server rồi bác ạ!");
        }
    },
    render: function(roadmaps) {
        let html = '';

        if (!roadmaps || roadmaps.length === 0) {
            html = `
                <div class="col-12 text-center py-5">
                    <p class="text-muted">Chưa có lộ trình nào được xuất bản bác ơi.</p>
                </div>`;
        } else {
            roadmaps.forEach(item => {
                html += `
                <div class="col-md-6 col-lg-3">
                    <a href="../road_map/road-map-detail.html?id=${item.id}" class="roadmap-card shadow-sm">
                        <div class="roadmap-icon">
                            <i class="bi bi-signpost-split-fill"></i>
                        </div>
                        <span class="step-count">
                            <i class="bi bi-layers-half me-1"></i>${item.courseCount || 0} Khóa học
                        </span>
                        <h4>${item.title}</h4>
                        <p class="roadmap-desc">
                            ${item.description || 'Lộ trình bài bản giúp bác chinh phục kiến thức mới.'}
                        </p>
                    </a>
                </div>`;
            });
        }

        // Đổ HTML vào row, thay thế cái Spinner đang quay
        $('#roadmapList').html(html);
    },
   RoadMapDetail: async function(id) {
    try {
        const response = await fetch(`${this.config.apiUrl}/${id}/detail`);
        if (!response.ok) throw new Error("Mạng mẽo có vấn đề rồi bác ơi");
        
        const res = await response.json();
        const data = res.data;

        // 1. Cập nhật Banner - Lộ trình Free nếu tổng giá = 0 (hoặc theo logic backend)
        $('#roadmapTitle, #breadTitle').text(data.title);
        const descriptionHtml = `
            ${data.description || "Lộ trình bài bản giúp bạn chinh phục mục tiêu lập trình chuyên nghiệp tại hệ thống LMS."}
            <div class="disclaimer-text mt-3 text-danger fw-bold small">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                Các khóa học có thể chưa đầy đủ, LMS vẫn đang nỗ lực hoàn thiện trong thời gian sớm nhất.
            </div><br>
        `;
        $('#roadmapDesc').html(descriptionHtml);
        $('#roadmapThumb').attr('src', data.thumbnailUrl || '../assets/img/default-roadmap.png');
       

        // 2. Gom nhóm theo PhaseName
        const grouped = data.courses.reduce((acc, course) => {
            const key = course.phaseName || "Bắt đầu khởi tạo";
            if (!acc[key]) acc[key] = [];
            acc[key].push(course);
            return acc;
        }, {});

        // 3. Render các Giai đoạn và Khóa học
        let html = '';
        let stt = 1;

        for (const phaseName in grouped) {
    html += `
    <div class="phase-item">
        <div class="phase-icon"></div>
        <h3 class="phase-title">${phaseName}</h3>
        <div class="phase-body">
            ${grouped[phaseName].map(course => {
                const isCourseFree = Number(course.price) === 0;
                
                return `
                <div class="course-card" style="cursor: default;"> <div class="course-stt">${stt < 10 ? '0' + stt++ : stt++}</div>
                    <img src="${course.thumbnailUrl || 'placeholder.png'}" class="course-img" alt="${course.title}">
                    <div class="course-info flex-grow-1">
                        <h4>${course.title}</h4>
                        <div class="course-desc">${course.description || "Mô tả khóa học tại hệ thống LMS."}</div>
                        <div class="mt-2">
                            ${isCourseFree 
                                ? '<span class="badge bg-light text-success border small fw-bold">MIỄN PHÍ</span>' 
                                : '<span class="badge bg-warning text-dark small fw-bold">PRO</span>'
                            }
                        </div>
                    </div>
                    <button onclick="RoadMap.handleGoToDetail(${course.id})" class="btn-start">
                        Xem chi tiết
                    </button>
                </div>`;
            }).join('')}
        </div>
    </div>`;
}

        $('#roadmapContent').html(html);

    } catch (error) {
        console.error("Lỗi:", error);
    }
},
handleGoToDetail: async function(courseId) {
        debugger
    const token = localStorage.getItem("jwt_token");
    if (!token) {
        window.location.href = "/Home/detail.html?id=" + courseId;
        return;
    }

    try {
        const res = await $.ajax({
            url: `https://lms-u2jn.onrender.com/api/course/course-detail/${courseId}`,
            type: 'GET',
            headers: { 'Authorization': `Bearer ${token}` } // QUAN TRỌNG: Phải có dòng này
        });
        const data = res.data || res; 
        
        if (data.isEnrolled) {
            console.log("Đã mua, vào học thôi!");
            window.location.href = "/learn/learning.html?id=" + courseId;
        } else {
            console.log("Chưa mua, xem giới thiệu đã.");
            window.location.href = "/Home/detail.html?id=" + courseId;
        }
    } catch (error) {
        console.error("Lỗi API hoặc Token hết hạn:", error);
        // Nếu lỗi (401 chẳng hạn), cứ cho xem Detail như khách vãng lai
        window.location.href = "/Home/detail.html?id=" + courseId;
    }
}
}
