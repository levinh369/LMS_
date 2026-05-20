var RoadMapBuider = {
    currentPage: 0,
    roadmapId: null,
    config: {
        apiUrl: "https://lms-u2jn.onrender.com/api/roadmap",
        pageSize: 10
    },

    init: function () {
        const params = new URLSearchParams(window.location.search);
        RoadMapBuider.roadmapId = params.get('id');
        if (!RoadMapBuider.roadmapId) {
            Swal.fire('Lỗi!', 'Không tìm thấy ID lộ trình bác ơi, quay lại thôi!', 'error')
                .then(() => {
                    window.location.href = 'roadmap-index.html';
                });
            return;
        }
        RoadMapBuider.LoadData(RoadMapBuider.roadmapId);
        RoadMapBuider.initSortable();
    },

    initSortable: function () {
        const _this = this;
        const commonConfig = {
            group: 'courses',
            animation: 150,
            ghostClass: 'ghost',
            handle: '.handle',
            onEnd: function () {
                _this.updateUI();
            }
        };

        new Sortable(document.getElementById('allCoursesList'), commonConfig);
        new Sortable(document.getElementById('roadmapStepsList'), commonConfig);
    },

    LoadData: async function (id) {
        try {
            const response = await fetch(`${RoadMapBuider.config.apiUrl}/${id}/builder-data`);
            if (!response.ok) throw new Error('Mạng lỗi hoặc Server có vấn đề');

            const res = await response.json();
            const roadmapDetail = res.data;

            // Render 2 cột: Kho bên trái và Lộ trình bên phải
            RoadMapBuider.renderList('#allCoursesList', roadmapDetail.availableCourses, false);
            RoadMapBuider.renderList('#roadmapStepsList', roadmapDetail.courses, true);
            RoadMapBuider.updateUI();

        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu:", error);
            Swal.fire('Lỗi!', 'Không load được dữ liệu bác ơi.', 'error');
        }
    },

    renderList: function (containerId, courses, isRightColumn) {
        let html = '';
        if (courses && courses.length > 0) {
            courses.forEach((item, index) => {
                // Kiểm tra nếu dữ liệu từ DB trả về là Giai đoạn (Phase)
                if (item.isPhase) {
                    html += `
                        <div class="list-group-item bg-light border-primary border-start border-4 shadow-sm" data-is-phase="true">
                            <div class="d-flex align-items-center w-100">
                                <i class="bi bi-grip-vertical handle me-2"></i>
                                <input type="text" class="form-control form-control-sm fw-bold border-0 bg-transparent phase-name-input" 
                                       value="${item.title}" placeholder="Tên giai đoạn...">
                                <button class="btn btn-link btn-sm text-danger p-0 ms-2" onclick="$(this).closest('.list-group-item').remove(); RoadMapBuider.updateUI();">
                                    <i class="bi bi-x-circle-fill"></i>
                                </button>
                            </div>
                        </div>`;
                } else {
                    const iconClass = isRightColumn ? 'bi-trash' : 'bi-plus-lg text-primary';
                    const btnClass = isRightColumn ? 'btn-outline-danger' : 'btn-light';

                    html += `
                        <div class="list-group-item d-flex align-items-center" data-id="${item.id}" data-is-phase="false">
                            <i class="bi bi-grip-vertical handle me-2"></i>
                            <div class="step-num-box"></div> 
                            <span class="flex-grow-1 fw-medium">${item.title}</span>
                            <button class="btn btn-sm ms-2 action-btn ${btnClass}" onclick="RoadMapBuider.toggleMove(this)">
                                <i class="bi ${iconClass}"></i>
                            </button>
                        </div>`;
                }
            });
        }
        $(containerId).html(html);
    },

    // 1. Hàm thêm Giai đoạn mới
    addPhase: function () {
        $('#emptyNote').hide();
        const phaseHtml = `
            <div class="list-group-item bg-light border-primary border-start border-4 shadow-sm" data-is-phase="true">
                <div class="d-flex align-items-center w-100">
                    <i class="bi bi-grip-vertical handle me-2"></i>
                    <input type="text" class="form-control form-control-sm fw-bold border-0 bg-transparent phase-name-input" 
                           value="Giai đoạn mới" placeholder="Tên giai đoạn...">
                    <button class="btn btn-link btn-sm text-danger p-0 ms-2" onclick="$(this).closest('.list-group-item').remove(); RoadMapBuider.updateUI();">
                        <i class="bi bi-x-circle-fill"></i>
                    </button>
                </div>
            </div>`;
        $('#roadmapStepsList').append(phaseHtml);
        this.updateUI();
    },

    updateUI: function() {
    const rightItems = $('#roadmapStepsList .list-group-item');
    if (rightItems.length > 0) $('#emptyNote').hide(); else $('#emptyNote').show();

    let courseCounter = 1; // Khởi tạo biến đếm riêng cho khóa học

    rightItems.each(function() {
        // Kiểm tra xem dòng hiện tại là Giai đoạn hay Khóa học
        const isPhase = $(this).attr('data-is-phase') === "true" || $(this).data('type') === 'phase';
        const stepBox = $(this).find('.step-num-box');

        if (isPhase) {
            // Nếu là Giai đoạn: Xóa số thứ tự, không cho thụt lề
            stepBox.empty(); 
            $(this).css({ 'margin-left': '0', 'width': '100%' });
        } else {
            // Nếu là Khóa học: Hiển thị số thứ tự và tăng biến đếm
            stepBox.html(`<span class="step-num">${courseCounter}</span>`);
            courseCounter++; // CHỈ TĂNG KHI LÀ KHÓA HỌC

            // Logic thụt lề bác đã yêu cầu trước đó
            $(this).css({
                'margin-left': '40px',
                'width': 'calc(100% - 40px)',
                'background-color': '#fff'
            });

            // Cập nhật nút bấm thành nút Xóa (thùng rác)
            const btn = $(this).find('.action-btn');
            btn.removeClass('btn-light').addClass('btn-outline-danger');
            btn.find('i').attr('class', 'bi bi-trash');
        }
    });

    // Cột bên trái (Kho khóa học) luôn reset số thứ tự
    $('#allCoursesList .list-group-item').each(function() {
        $(this).css({ 'margin-left': '0', 'width': '100%' });
        $(this).find('.step-num-box').empty();
        const btn = $(this).find('.action-btn');
        btn.removeClass('btn-outline-danger').addClass('btn-light');
        btn.find('i').attr('class', 'bi bi-plus-lg text-primary');
    });
},
    toggleMove: function (btn) {
        const item = $(btn).closest('.list-group-item');
        const parentId = item.parent().attr('id');

        if (parentId === 'allCoursesList') {
            $('#roadmapStepsList').append(item);
        } else {
            if (item.attr('data-is-phase') === "true") item.remove();
            else $('#allCoursesList').append(item);
        }
        RoadMapBuider.updateUI();
    },

    saveRoadmap: async function () {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });

    let updateData = [];
    let currentPhaseName = ""; // Khởi tạo rỗng để Backend tự xử lý logic mặc định

    const steps = $('#roadmapStepsList .list-group-item');

    steps.each(function (index) {
        const isPhase = $(this).attr('data-is-phase') === "true";

        if (isPhase) {
            // Gặp thanh Giai đoạn thì lấy tên người dùng nhập
            currentPhaseName = $(this).find('.phase-name-input').val();
        } else {
            // Đẩy vào danh sách. Nếu khóa học ở trên cùng, phaseName sẽ là ""
            updateData.push({
                courseId: parseInt($(this).attr('data-id')),
                orderIndex: index,
                phaseName: currentPhaseName
            });
        }
    });

    // 1. Kiểm tra nếu không có khóa học nào
    if (updateData.length === 0) {
        const result = await Swal.fire({
            title: 'Bác định xóa sạch à?',
            text: "Lộ trình này sẽ không còn khóa học nào đâu nhé!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ừ, xóa trắng đi!',
            cancelButtonText: 'Để tôi chọn lại'
        });
        if (!result.isConfirmed) return;
    }

    try {
        // 2. Tiến hành gửi dữ liệu mảng Object kèm phaseName
        const response = await $.ajax({
            url: `${this.config.apiUrl}/${this.roadmapId}/courses`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(updateData)
        });

        Toast.fire({
            icon: 'success',
            title: response.message || "Lưu lộ trình thành công!"
        });
        RoadMapBuider.LoadData(RoadMapBuider.roadmapId);
    } catch (error) {
        const errorMsg = error.responseJSON?.message || "Lỗi hệ thống bác ơi!";
        Toast.fire({
            icon: 'error',
            title: errorMsg
        });
        console.error("Lỗi chi tiết:", error);
    }
}
}

$(document).ready(function () {
    RoadMapBuider.init();
});