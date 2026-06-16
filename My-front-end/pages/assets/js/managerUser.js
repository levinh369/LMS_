// Cấu hình Toast dùng chung
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

var Manager = {
    config: {
        pageSize: 10,
        apiUrl: "https://lms-u2jn.onrender.com/api/user",
        apiUrlEnroll: "https://lms-u2jn.onrender.com/api/Enroll"
    },
    roleId: 0,
    tempCourses: {},
    sharedEvents: {
        // Hàm đăng ký sự kiện Checkbox cho bất kỳ bảng nào
        registerCheckboxEvents: function(parentObj) {
            // parentObj ở đây có thể là Manager hoặc Manager.trash
            
            $(document).off('change', '#check-all').on('change', '#check-all', function() {
                const isChecked = $(this).prop('checked');
                $('.item-check').prop('checked', isChecked);
                parentObj.toggleBulkActions(); // Gọi hàm của đối tượng đang sử dụng
            });

            $(document).off('change', '.item-check').on('change', '.item-check', function() {
                const allChecked = $('.item-check:checked').length === $('.item-check').length;
                $('#check-all').prop('checked', $('.item-check').length > 0 && allChecked);
                parentObj.toggleBulkActions();
            });
        },

        // Hàm xử lý ẩn hiện thanh Bulk Actions
        toggleBulkUI: function() {
            const selectedCount = $('.item-check:checked').length;
            if (selectedCount > 0) {
                $('#bulk-actions').fadeIn(200);
                $('#selected-count').text(selectedCount);
            } else {
                $('#selected-count').text(0); 
                $('#bulk-actions').fadeOut(200);
                $('#check-all').prop('checked', false);
            }
        }
    },
    toggleBulkActions: function() {
        const selectedCount = $('.item-check:checked').length;
        const $bulkBar = $('#bulk-actions');
        
        if (selectedCount > 0) {
            $bulkBar.show(); // Hiện thanh xóa
            $('#selected-count').text(selectedCount);
        } else {
            $bulkBar.hide(); // Ẩn thanh xóa
            $('#check-all').prop('checked', false); // Bỏ tích luôn ô trên đầu
        }
    },

    // Hàm hủy chọn tất cả
    uncheckAll: function() {
        $('.item-check, #check-all').prop('checked', false);
        this.toggleBulkActions();
    },
    init: function () {
        const userInfoRaw = localStorage.getItem("user_info");
        if (!userInfoRaw) {
            window.location.href = "/auth/login.html";
            return;
        }

        const user = JSON.parse(userInfoRaw);
        const roleId = parseInt(user.role); 
        
        // Cập nhật vào thuộc tính chung để loadData sử dụng chính xác
        this.roleId = roleId; 

        // --- XỬ LÝ PHÂN QUYỀN GIAO DIỆN ---
        // Sử dụng biến cục bộ roleId ở đây hoàn toàn ổn
        if (roleId === 1) {
            $('.admin-only').show();
            $('.teacher-only').remove();
            $('#page-title').text("Hệ Thống Người Dùng");
            $('#page-subtitle').text("Quản trị toàn bộ tài khoản học viên và giảng viên");
        } else if (roleId === 3) {
            $('.teacher-only').show();
            $('.admin-only').remove();
            $('#page-title').text("Quản Lý Học Viên");
            $('#page-subtitle').text("Danh sách học viên tham gia các khóa học của bạn");
            this.loadCoursesByTeacher(); 
        }

        // --- RENDER DỮ LIỆU ---
        // Truyền biến cục bộ vào hàm render
        Manager.sharedEvents.registerCheckboxEvents(this);
        this.renderHeader(roleId);
        this.loadData(1);
        
        // Gán sự kiện tìm kiếm
        $('#keySearch').off('keypress').on('keypress', function(e) {
            if (e.which == 13) Manager.loadData(1);
        });
    },

   renderHeader: function (role) {
    let html = '';
    if (role === 1) { // ADMIN
        html = `
            <tr class="small text-uppercase fw-bold">
                <th class="ps-4" style="width: 50px;"><input class="form-check-input" type="checkbox" id="check-all"></th>
                <th style="width: 80px;">ID</th>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th class="text-center">Ngày tạo</th>
                <th class="text-center">Trạng thái</th>
                <th class="text-center">Hành động</th>
            </tr>`;
    } else { // TEACHER (Hoặc các role khác)
        html = `
            <tr class="small text-uppercase fw-bold">
                <th class="ps-4" style="width: 80px;">ID</th>
                <th>Học viên</th>
                <th>Email</th>
                <th>Khóa học đang học</th>
                <th class="text-center">Ngày tham gia</th>
                <th class="text-center">Trạng thái</th>
                <th class="text-center">Thao tác</th>
            </tr>`;
    }
    $('#table-header').html(html);
},
    loadCoursesByTeacher: async function() {
    try {
        const token = localStorage.getItem("jwt_token"); // Hoặc "access_token" tùy bác lưu
        if (!token) return;
        const response = await fetch('https://lms-u2jn.onrender.com/api/course/lookup', {
            method: 'GET',
            headers: { 
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        const res = await response.json();
        
        if (res.success && res.data) {
            const $courseSelect = $('#courseId');
            $courseSelect.find('option:not([value="-1"])').remove(); 

            res.data.forEach(c => {
                $courseSelect.append(`<option value="${c.id}">${c.title}</option>`);
            });
            
            console.log("Đã load xong danh sách khóa học vào bộ lọc");
        }
    } catch (e) { 
        console.error("Lỗi khi gọi API Courses:", e); 
    }
},
    loadData: async function(page) {
        const userInfoRaw = localStorage.getItem("user_info");
        const user = JSON.parse(userInfoRaw);
        const roleId = parseInt(user.role);
        const pageSize = this.config.pageSize || 10; 
        TableLoader.show('#user-table-body');
        // Khởi tạo params với các giá trị dùng chung
        const params = new URLSearchParams({
            page: page,
            pageSize: pageSize,
            keySearch: $('#keySearch').val() || '',
            fromDate: $('#fromDate').val() || '', // Lấy từ ô input date mới thêm
            toDate: $('#toDate').val() || ''      // Lấy từ ô input date mới thêm
        });

        // Thêm logic lọc riêng cho từng Role
        if (roleId === 1) {
            // ADMIN: Lọc theo Role và Trạng thái tài khoản
            params.append('roleId', $('#roleId').val() || -1);
            params.append('isActive', $('#isActive').val() || -1);
            params.append('courseId', -1); // Admin thường xem tất cả
        } 
        else if (roleId === 3) {
            // TEACHER: Lọc theo Khóa học cụ thể
            params.append('roleId', 2); // Teacher thường chỉ quản lý Student (Role 2)
            params.append('courseId', $('#courseId').val() || -1);
            params.append('isActive', -1); // Tùy bác có muốn Teacher lọc trạng thái không
        }
        try {
            const response = await fetch(`${this.config.apiUrl}/list-data?${params.toString()}`, {
                headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
            });

            const res = await response.json();

            if (res.success || res.Success) {
                const list = res.data || res.Data || [];
                const totalCount = res.total || res.Total || 0;
                const totalPages = Math.ceil(totalCount / pageSize);

                this.renderTable(list);
                this.showPaging(totalCount, totalPages, page);
                $('#total-records').text(totalCount); 
            }
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ' });
        }
    },

   renderTable: function (data) {
    const userInfo = JSON.parse(localStorage.getItem("user_info"));
    const currentRole = parseInt(userInfo.role); // 1: Admin, 3: Teacher
    let html = '';
    this.tempCourses = {};
    if (!data || data.length === 0) {
        html = '<tr><td colspan="7" class="text-center p-4 text-muted">Không có dữ liệu người dùng</td></tr>';
    } else {
        let displayData = data;

        displayData.forEach(item => {
            let statusBadge = item.isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
            let statusText = item.isActive ? 'Hoạt động' : 'Bị khóa';
            this.tempCourses[item.id] = item.courses || [];
            // 2. Xử lý Logic hiển thị cho ADMIN
            if (currentRole === 1) {
                let roleClass = item.roleId == 1 ? 'bg-danger' : (item.roleId == 3 ? 'bg-info' : 'bg-secondary');
                html += `
                <tr>
                    <td class="ps-4">
                        <input class="form-check-input item-check" type="checkbox" value="${item.id}">
                    </td>
                    <td class="text-muted small">#${item.id}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${item.avatarUrl || '../assets/img/default-avatar.png'}" 
                                 class="user-avatar me-3" style="width:30px; height:30px; border-radius:50%; object-fit: cover;">
                            <div class="fw-bold">${item.fullName}</div>
                        </div>
                    </td>
                    <td class="small">${item.email}</td>
                    <td><span class="badge ${roleClass}">${item.roleName}</span></td>
                    <td class="text-center small text-muted">${new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td class="text-center">
                        <span role="button" onclick="Manager.toggleStatus(${item.id})" 
                              class="badge rounded-pill ${statusBadge}" style="cursor: pointer;">
                              ${statusText}
                        </span>
                    </td>
                    <td class="text-center">
                        <div class="btn-group shadow-sm">
                            <button onclick="Manager.openDetail(${item.id}, ${item.roleId})" class="btn btn-sm btn-light border" title="Xem chi tiết">
                                <i class="bi bi-eye text-primary"></i>
                            </button>
                            <button onclick="Manager.openEdit(${item.id})" class="btn btn-sm btn-light border" title="Chỉnh sửa">
                                <i class="bi bi-pencil-square text-warning"></i>
                            </button>
                            <button onclick="Manager.deleteUser(${item.id}, '${item.fullName}')" class="btn btn-sm btn-light border" title="Xóa">
                                <i class="bi bi-trash text-danger"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            } 
            
            else if (currentRole === 3) {
                const listCourses = item.courses || []; 
                const limit = 2; // Chỉ hiện tối đa 2 badge

                let courseBadges = "";
                if (listCourses.length > 0) {
                    courseBadges = listCourses.slice(0, limit).map(c => {
                        let badgeColor = c.progress >= 100 ? "bg-success-subtle text-success" : "bg-info-subtle text-info";
                        return `
                        <span class="badge ${badgeColor} border me-1 small" 
                              style="font-size: 10px; font-weight: 500;" 
                              title="Tiến độ: ${c.progress}%">
                            ${c.courseName}
                        </span>`;
                    }).join('');

                    if (listCourses.length > limit) {
                        courseBadges += `
                        <span class="badge bg-secondary-subtle text-secondary border small" 
                              style="font-size: 10px;" 
                              title="Xem thêm ${listCourses.length - limit} khóa khác trong phần Quản lý">
                            +${listCourses.length - limit}
                        </span>`;
                    }
                } else {
                    courseBadges = `<span class="text-muted small" style="font-size: 11px;">Chưa đăng ký</span>`;
                }

                html += `
                <tr>
                    <td class="ps-4 text-muted small">#${item.id}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${item.avatarUrl || '../assets/img/default-avatar.png'}" 
                                 class="user-avatar me-3" style="width:30px; height:30px; border-radius:50%; object-fit: cover;">
                            <div class="fw-bold">${item.fullName}</div>
                        </div>
                    </td>
                    <td class="small">${item.email}</td>
                    <td>${courseBadges}</td>
                    <td class="text-center small text-muted">${new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td class="text-center">
                         <span class="badge rounded-pill ${statusBadge}">${statusText}</span>
                    </td>
                    <td class="text-center">
                        <div class="btn-group shadow-sm">
                            <button onclick="Manager.openDetail(${item.id})" class="btn btn-sm btn-light border" title="Xem hồ sơ">
                                <i class="bi bi-eye text-primary"></i>
                            </button>
                            <button onclick="Manager.openCourseModal(${item.id}, '${item.fullName}')" class="btn btn-sm btn-light border" title="Quản lý khóa học">
                                <i class="bi bi-person-gear text-dark"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }
        });
    }
    
    // Đổ dữ liệu vào table body
    $('#user-table-body').html(html);
},
softDeleteBulk: function() {
    const ids = $('.item-check:checked').map(function() { 
        return parseInt($(this).val()); 
    }).get();
    
    if (ids.length === 0) return;

    Swal.fire({
        title: `Xóa ${ids.length} người dùng?`,
        text: "Các tài khoản này sẽ được chuyển vào thùng rác!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
        // BỎ showLoaderOnConfirm và preConfirm đi để tránh xung đột UI
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // 1. BẬT GLOBAL LOADER KHÓA MÀN HÌNH NGAY KHI USER BẤM ĐỒNG Ý
                GlobalLoader.show();

                const response = await fetch(`${this.config.apiUrl}/soft-delete-bulk`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem("jwt_token")
                    },
                    body: JSON.stringify(ids)
                });
                
                const res = await response.json();
                
                if (!response.ok) {
                    throw new Error(res.Message || res.message || 'Lỗi từ server');
                }

                const isSuccess = res.Success || res.success;
                if (isSuccess) {
                    Toast.fire({
                        icon: 'success',
                        title: res.Message || res.message || 'Thành công!'
                    });
                    Manager.uncheckAll(); 
                    Manager.loadData(1); 
                } else {
                    Toast.fire({
                        icon: 'error',
                        title: res.Message || res.message || 'Có lỗi xảy ra'
                    });
                }
            } catch (error) {
                console.error(error);
                Toast.fire({
                    icon: 'error',
                    title: `Lỗi: ${error.message}`
                });
            } finally {
                // 2. LUÔN LUÔN TẮT GLOBAL LOADER KHI KẾT THÚC
                GlobalLoader.hide();
            }
        }
    });
},
openCourseModal: function(userId, fullName) {
    $('#managedUserId').val(userId);
    $('#managedStudentName').text(fullName);
    
    const courses = this.tempCourses[userId] || [];
    this.renderManagedCourses(userId, courses);
    
    // Dọn dẹp các lớp sương mờ bị kẹt (nếu có) do bấm lỗi trước đó
    $('.modal-backdrop').remove(); 
    
    // Bứng Modal ra sát body và bật lên
    $('#courseManagementModal').appendTo("body").modal('show');
}, 

    renderManagedCourses: function(userId, courses) {
        
    let html = '';
    if (courses && courses.length > 0) {
        courses.forEach(c => {
            // Xác định màu sắc dựa trên tiến độ
            let colorClass = 'primary';
            if (c.progress >= 100) colorClass = 'success';
            else if (c.progress < 30) colorClass = 'warning';

            html += `
            <div class="col-12">
                <div class="course-item-card p-3 border rounded-4 bg-white shadow-sm hover-shadow transition">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="me-2">
                            <h6 class="fw-bold mb-0 text-dark">${c.courseName}</h6>
                            <small class="text-muted">Mã KH: #${c.courseId}</small>
                        </div>
                        <button onclick="Manager.unenroll(${userId}, ${c.courseId}, '${c.courseName}')" 
                                class="btn btn-sm btn-outline-danger border-0 rounded-circle p-2" 
                                title="Hủy đăng ký khóa học">
                            <i class="bi bi-trash3-fill"></i>
                        </button>
                    </div>
                    
                    <div class="progress-info d-flex justify-content-between align-items-center mt-3 mb-1">
                        <span class="small fw-bold text-${colorClass}">${c.progress}% Hoàn thành</span>
                        <i class="bi bi-check2-circle text-${colorClass} ${c.progress < 100 ? 'd-none' : ''}"></i>
                    </div>
                    
                    <div class="progress shadow-sm" style="height: 8px; border-radius: 10px;">
                        <div class="progress-bar bg-${colorClass} progress-bar-striped progress-bar-animated" 
                             role="progressbar" 
                             style="width: ${c.progress}%">
                        </div>
                    </div>
                </div>
            </div>`;
        });
    } else {
        html = `
        <div class="col-12 text-center py-5">
            <img src="../assets/img/empty-box.png" style="width: 80px; opacity: 0.5" class="mb-3">
            <p class="text-muted small">Học viên này chưa đăng ký khóa học nào của bạn.</p>
        </div>`;
    }
    $('#managedCourseList').html(html);
},
   unenroll: function(userId, courseId, courseName) {
    Swal.fire({
        title: 'Xác nhận xóa?',
        text: `Học viên sẽ bị loại khỏi khóa "${courseName}". Thao tác này không thể hoàn tác!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Bỏ qua'
    }).then(async (result) => { // Thêm async ở đây để dùng await
        if (result.isConfirmed) {
            try {
                // 1. KHÓA MÀN HÌNH TRÁNH SPAM CLICK
                GlobalLoader.show();

                // Chuyển sang dùng await $.ajax nhìn code cực kỳ gọn và hiện đại
                const res = await $.ajax({
                    url: `${this.config.apiUrlEnroll}/unenroll?studentId=${userId}&courseId=${courseId}`,
                    type: 'DELETE',
                    headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
                });

                // Check cả success (camelCase) hoặc Success từ server trả về
                if (res.success || res.Success) {
                    // 2. ĐỒNG BỘ: Hiện thông báo Toast góc màn hình cho tinh tế
                    Toast.fire({
                        icon: 'success',
                        title: res.message || res.Message || 'Đã hủy đăng ký khóa học!'
                    });
                    
                    // Cập nhật ngay biến tạm để đồng bộ dữ liệu
                    this.tempCourses[userId] = this.tempCourses[userId].filter(x => x.courseId !== courseId);
                    
                    // Render lại danh sách trong Modal quản lý
                    this.renderManagedCourses(userId, this.tempCourses[userId]);
                    
                    // Load lại bảng chính để mất Badge khóa học
                    this.loadData(); 
                } else {
                    Toast.fire({
                        icon: 'error',
                        title: res.message || res.Message || 'Hủy đăng ký thất bại!'
                    });
                }

            } catch (error) {
                console.error("Lỗi unenroll:", error);
                let errorMsg = error.responseJSON?.message || error.responseJSON?.Message || 'Không thể thực hiện yêu cầu lúc này.';
                Toast.fire({
                    icon: 'error',
                    title: errorMsg
                });
            } finally {
                // 3. GIẢI PHÓNG MÀN HÌNH LUÔN NẰM Ở FINALLY
                GlobalLoader.hide();
            }
        }
    });
},
// ==========================================
    // HÀM openDetail ĐÃ FIX LỖI HIỂN THỊ TAB
    // ==========================================
    openDetail: async function (id, roleId) {
        if ($('#frmUser').length > 0) {
            $('#frmUser')[0].reset(); 
        }
        $('#userDetail-history-body').empty(); 
        
        $('#modalTitle').text('Chi Tiết Người Dùng');
        $('#emailInput').prop('readonly', true).addClass('bg-light');
        $('#createdAtContainer').show();
        $('#passArea').hide();
        
        this.setReadOnly(true); 
        $('.modal-footer').hide();
        
        // Ép kiểu roleId về String để tránh lỗi so sánh (ví dụ truyền vào số 3 thay vì "3")
        const currentRole = String(roleId);
        console.log("-> Đang mở chi tiết User ID:", id, "- Role ID nhận được:", currentRole);

        // 1. Hiện thanh menu chuyển Tab tổng
        // Chỉ cần bỏ d-none và dùng d-flex của Bootstrap thay vì can thiệp css inline
        $('#userModalTabs').removeClass('d-none').addClass('d-flex');
        
        // 2. Kiểm tra vai trò trực tiếp để ẩn/hiện nút Tab 2
        if (currentRole === "3") {
            $('#history-tab').closest('li.nav-item').removeClass('d-none'); // Hiện tab
            console.log("-> Xác nhận Giảng viên: Hiện Tab lịch sử.");
        } else {
            $('#history-tab').closest('li.nav-item').addClass('d-none'); // Ẩn đi
            console.log("-> Tài khoản khác: Ẩn Tab lịch sử.");
        }

        // 3. Reset trạng thái hiển thị của các Tab Content (Quan trọng)
        $('.tab-pane').removeClass('show active'); // Xóa trạng thái active của tất cả các tab content
        $('#tab-info').addClass('show active');    // Kích hoạt lại content của tab thông tin

        // 4. Ép quay về Tab 1 (Nút bấm) làm mặc định ban đầu
        const tabTarget = document.getElementById('info-tab');
        if (tabTarget) {
            bootstrap.Tab.getOrCreateInstance(tabTarget).show();
        }

        // 5. Gắn sự kiện click vào Tab lịch sử để tải dữ liệu
        $('#history-tab').off('click').on('click', () => {
            this.loadUserWithdrawHistory(id, 1);
        });

        // 6. Hiển thị modal lên màn hình và gọi API load data cá nhân
        bootstrap.Modal.getOrCreateInstance('#userModal').show();
        await this.loadDetail(id); 
    },
    openEdit: async function (id) {
        if ($('#frmUser').length > 0) {
            $('#frmUser')[0].reset(); 
        }
        $('#userDetail-history-body').empty(); 
        
        $('#modalTitle').text('Cập Nhật Người Dùng');
        $('#emailInput').prop('readonly', true).addClass('bg-light'); 
        $('#createdAtContainer').show();
        $('#passArea').hide();
        
        this.setReadOnly(false);
        $('.modal-footer').show();

        // Ẩn thanh menu Tabs đi bằng d-none và ép về tab thông tin
        $('#userModalTabs').addClass('d-none');
        const tabTarget = document.getElementById('info-tab');
        if (tabTarget) {
            bootstrap.Tab.getOrCreateInstance(tabTarget).show();
        }

        bootstrap.Modal.getOrCreateInstance('#userModal').show();
        await this.loadDetail(id);
    },

    // ==========================================
    // 3. HÀM MỞ THÊM MỚI (CREATE)
    // ==========================================
   openCreateModal: function () {
    if ($('#frmUser').length > 0) {
        $('#frmUser')[0].reset(); 
    }
    $('#createdAtInput').val(''); 
    $('#userDetail-history-body').empty(); 
    $('#userDetail-history-pagination').empty(); 
    
    $('input[name="isActive"]').prop('checked', true); 
    
    // === ĐÃ BỎ DÒNG GÁN MẶC ĐỊNH LÀ 2 ===
    // Thay vào đó, nếu bác muốn nó reset về lựa chọn đầu tiên (ví dụ: "Chọn vai trò" hoặc option đầu) thì dùng dòng dưới:
    $('#modalRoleId').prop('selectedIndex', 0); 

    $('#modalTitle').text('Thêm Người Dùng Mới');
    $('#emailInput').prop('readonly', false).removeClass('bg-light'); 
    $('#createdAtContainer').hide();
    $('#passArea').show();
    
    this.setReadOnly(false);
    $('.modal-footer').show();

    // Ẩn thanh menu Tabs đi bằng d-none và ép về tab thông tin
    $('#userModalTabs').addClass('d-none');
    const tabTarget = document.getElementById('info-tab');
    if (tabTarget) {
        bootstrap.Tab.getOrCreateInstance(tabTarget).show();
    }

    bootstrap.Modal.getOrCreateInstance('#userModal').show();
}, 
    loadUserWithdrawHistory: async function (userId, pageIndex = 1) {
        const historyBody = document.getElementById('userDetail-history-body');
        const paginationDiv = document.getElementById('userDetail-history-pagination');
        
        // Sửa colspan="5" thành colspan="7"
        historyBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Đang tải lịch sử...</td></tr>`;
        paginationDiv.innerHTML = '';

        const token = localStorage.getItem("jwt_token");

        try {
            const response = await fetch(`https://lms-u2jn.onrender.com/api/Withdrawal/admin/teacher-history/${userId}?pageIndex=${pageIndex}&pageSize=5`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Không thể tải lịch sử tài chính.");
            const result = await response.json();

            historyBody.innerHTML = ''; 

            if (!result.data || result.data.length === 0) {
                // Sửa colspan="5" thành colspan="7"
                historyBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="bi bi-info-circle me-1"></i> Tài khoản này chưa có dữ liệu rút tiền.</td></tr>`;
                return;
            }

            // Vòng lặp kết xuất dữ liệu
            result.data.forEach(item => {
                let badge = '';
                if (item.status === 0) badge = '<span class="badge bg-warning text-warning bg-opacity-10 rounded-pill px-2 py-1">Chờ duyệt</span>';
                else if (item.status === 1) badge = '<span class="badge bg-success text-success bg-opacity-10 rounded-pill px-2 py-1">Thành công</span>';
                else if (item.status === 2) badge = `<span class="badge bg-danger text-danger bg-opacity-10 rounded-pill px-2 py-1" title="${item.note || ''}">Bị hủy</span>`;

                const date = new Date(item.createdAt).toLocaleDateString('vi-VN');
                const amount = new Intl.NumberFormat('vi-VN').format(item.amount) + " đ";
                
                // Lấy số tài khoản và ghi chú (Nếu API không có thì để ---)
                // Tuỳ API của bạn trả về field tên gì, ở đây mình giả định là accountNumber
                const accNumber = item.accountNumber || '---'; 
                const note = item.note || '---';

                const row = `
                    <tr>
                        <td class="ps-3 py-2 fw-bold text-secondary text-center">#${item.id}</td>
                        <td class="py-2 fw-bold text-danger">${amount}</td>
                        <td class="py-2 text-muted">${item.bankName || '---'}</td>
                        <td class="py-2 fw-semibold text-dark">${accNumber}</td>
                        <td class="py-2 text-secondary">${date}</td>
                        <td class="py-2 text-muted" style="max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${note}">${note}</td>
                        <td class="pe-3 py-2 text-center">${badge}</td>
                    </tr>`;
                historyBody.insertAdjacentHTML('beforeend', row);
            });

            this.renderMiniPagination(result.total, pageIndex, userId);

        } catch (error) {
            // Sửa colspan="5" thành colspan="7"
            historyBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${error.message}</td></tr>`;
        }
    },
    // Hàm phụ render nút phân trang mini cho tab lịch sử
    renderMiniPagination: function (totalRecords, currentPage, userId) {
        const pagDiv = document.getElementById('userDetail-history-pagination');
        const totalPages = Math.ceil(totalRecords / 5); // PageSize cố định là 5 đơn
        if (totalPages <= 1) return;

        let html = `<div class="btn-group btn-group-sm">`;
        html += `<button type="button" class="btn btn-outline-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="UserAdmin.loadUserWithdrawHistory(${userId}, ${currentPage - 1})"><i class="bi bi-chevron-left"></i></button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            html += `<button type="button" class="btn ${currentPage === i ? 'btn-primary' : 'btn-outline-secondary'}" onclick="UserAdmin.loadUserWithdrawHistory(${userId}, ${i})">${i}</button>`;
        }
        
        html += `<button type="button" class="btn btn-outline-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="UserAdmin.loadUserWithdrawHistory(${userId}, ${currentPage + 1})"><i class="bi bi-chevron-right"></i></button>`;
        html += `</div>`;

        pagDiv.innerHTML = html;
    },
loadDetail: async function (id) {
    try {
        const response = await fetch(`${this.config.apiUrl}/${id}`, {
            headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
        });
        const res = await response.json();
        const data = res.data;

        if (data) {
            const $form = $('#frmUser');

            // 1. Đổ dữ liệu cơ bản từ API Detail
            $form.find('#userId').val(data.id);
            $form.find('#fullName').val(data.fullName || '');
            $form.find('#emailInput').val(data.email || '');
            $form.find('#modalRoleId').val(data.roleId);
            
            // Cập nhật trạng thái hiển thị
            $('#modalIsActive').prop('checked', data.isActive);
            this.updateStatusLabel(data.isActive);
            $('#userAvatarPreview').attr('src', data.avatarUrl || '../assets/img/default-avatar.png');
            $('#createdAtLabel').text(data.createdAt ? new Date(data.createdAt).toLocaleString('vi-VN') : '--/--/----');

            // 2. Lấy dữ liệu khóa học từ BIẾN TẠM (đã lưu lúc renderTable)
            const container = $('#courseProgressContainer');
            let courseHtml = '';
            
            // Truy xuất mảng courses bằng ID người dùng
            const listCourses = this.tempCourses[id] || [];

            if (listCourses.length > 0) {
                listCourses.forEach(c => {
                    // Logic màu sắc: 100% (Xanh lá), < 30% (Vàng), Còn lại (Xanh dương)
                    let barColor = c.progress >= 100 ? 'bg-success' : (c.progress < 30 ? 'bg-warning' : 'bg-primary');

                    courseHtml += `
                    <div class="col-md-6">
                        <div class="p-3 border rounded-3 bg-light-subtle shadow-sm h-100">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="fw-bold small text-truncate" title="${c.courseName}">${c.courseName}</span>
                                <span class="badge rounded-pill bg-white text-dark border small" style="font-size: 10px;">${c.progress}%</span>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar ${barColor} progress-bar-striped progress-bar-animated" 
                                     role="progressbar" style="width: ${c.progress}%"></div>
                            </div>
                        </div>
                    </div>`;
                });
            } else {
                courseHtml = '<div class="col-12 text-center py-3 text-muted small">Chưa đăng ký khóa học nào.</div>';
            }

            // QUAN TRỌNG: Đổ HTML đã tạo vào container trong Modal
            container.html(courseHtml);
        }
    } catch (error) {
        console.error("Lỗi khi tải chi tiết người dùng:", error);
    }
},

    save: async function () {
        const id = $('#userId').val();
        const isUpdate = id && id > 0;
        let dto = {
        fullName: $('#frmUser #fullName').val(),
        roleId: parseInt($('#modalRoleId').val()),
        isActive: $('#modalIsActive').is(':checked')
        };

        // 2. Nếu là THÊM MỚI (isUpdate = false)
        if (!isUpdate) {
        // Lấy thêm Email và Password
        // Lưu ý: emailInput phải khớp với tên thuộc tính trong Class C# của bạn
        dto.email = $('#frmUser #emailInput').val(); 
        dto.password = $('#frmUser #passwordInput').val(); 
        
        // Kiểm tra nhanh ở client (validate)
        if (!dto.email || !dto.password) {
            Toast.fire({ icon: 'warning', title: 'Vui lòng nhập đầy đủ Email và Mật khẩu khi tạo mới!' });
            return;
        }
    }

        try {
            GlobalLoader.show();
            const response = await fetch(isUpdate ? `${this.config.apiUrl}/${id}` : this.config.apiUrl, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', "Authorization": "Bearer " + localStorage.getItem("jwt_token") },
                body: JSON.stringify(dto)
            });
            const res = await response.json();
            if (res.success || res.Success) {
                Toast.fire({ icon: 'success', title: isUpdate ? 'Đã cập nhật!' : 'Đã thêm mới!' });
                bootstrap.Modal.getOrCreateInstance('#userModal').hide();
                this.loadData(1);
            }
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Lỗi khi lưu dữ liệu' });
        }
        finally {
            // LUÔN LUÔN TẮT GLOBAL LOADER KHI XỬ LÝ XONG
            GlobalLoader.hide();
        }
    },

    toggleStatus: async function(id) {
        try {
            const response = await fetch(`${this.config.apiUrl}/toggle-status/${id}`, {
                method: 'PATCH',
                headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
            });
            const res = await response.json();
            if (res.success || res.Success) {
                Toast.fire({ icon: 'success', title: res.message || 'Đã đổi trạng thái' });
                this.loadData(1); 
            }
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Lỗi kết nối' });
        }
    },

   deleteUser: function(id, name) {
        Swal.fire({
            title: 'Xóa người dùng?',
            text: `Bạn có chắc muốn xóa "${name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xóa luôn!',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // BẬT LOADER KHÓA MÀN HÌNH KHI ĐANG GỌI XÓA
                    GlobalLoader.show();

                    const response = await fetch(`${this.config.apiUrl}/${id}`, {
                        method: 'DELETE',
                        headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
                    });
                    const res = await response.json();
                    if (res.success || res.Success) {
                        // ĐỒNG BỘ: Sửa thành Toast cho mượt
                        Toast.fire({ icon: 'success', title: res.message || res.Message || 'Đã xóa thành công' });
                        this.loadData(1);
                    } else {
                        Toast.fire({ icon: 'error', title: res.message || res.Message || 'Không thể xóa người dùng!' });
                    }
                } catch (error) {
                    Toast.fire({ icon: 'error', title: 'Lỗi hệ thống khi xóa dữ liệu' });
                } finally {
                    // GIẢI PHÓNG MÀN HÌNH
                    GlobalLoader.hide();
                }
            }
        });
    },

    setReadOnly: function (isReadOnly) {
        $('#fullName, #email, #modalRoleId').prop('readonly', isReadOnly);
        $('#modalRoleId, #modalIsActive').prop('disabled', isReadOnly);
    },

    resetForm: function () {
        $('#frmUser')[0].reset();
        $('#userId').val('');
        this.updateStatusLabel(true);
    },
    resetSearch: function() {
    // 1. Reset ô tìm kiếm từ khóa text
    $('#keySearch').val('');

    // 2. Reset các ô chọn (Select) về giá trị mặc định -1 (Tất cả)
    $('#roleId').val('-1');
    $('#courseId').val('-1');
    $('#isActive').val('-1');

    // 3. Reset các ô chọn ngày tháng về trống
    $('#fromDate').val('');
    $('#toDate').val('');

    this.loadData(1);
},
    updateStatusLabel: function(isActive) {
        const label = $('#statusLabel');
        if(isActive) label.text('Đang hoạt động').addClass('text-success').removeClass('text-danger');
        else label.text('Bị khóa').addClass('text-danger').removeClass('text-success');
    },

    showPaging: function (totalCount, totalPages, currentPage) {
        if (totalPages <= 1) {
            $('#paging-ul').empty().removeData("twbs-pagination").unbind("page");
            return;
        }
        $('#paging-ul').twbsPagination('destroy');
        $('#paging-ul').twbsPagination({
            totalPages: totalPages,
            visiblePages: 5,
            startPage: currentPage,
            first: '«', prev: '‹', next: '›', last: '»',
            onPageClick: (event, page) => { if (page !== currentPage) this.loadData(page); }
        });
    },
    trash: {
        init: function() {
            this.loadData(1);
            Manager.sharedEvents.registerCheckboxEvents(this);
        },

      
       toggleBulkActions: function() {
           Manager.sharedEvents.toggleBulkUI();
        },

        loadData: async function(page) {
            TableLoader.show('#user-trash-table-body');
            const keySearch = $('#search-user-trash').val() || "";
            const roleId = $('#filter-role-trash').val() || 0;
            const pageSize = Manager.config.pageSize;
            const url = `${Manager.config.apiUrl}/list-deleted?page=${page}&pageSize=${pageSize}&keySearch=${encodeURIComponent(keySearch)}&roleId=${roleId}`;

            try {
                const token = localStorage.getItem("jwt_token");
                const response = await fetch(url, {
                    headers: { "Authorization": "Bearer " + token }
                });
                const res = await response.json();

                if (res.success || res.Success) {
                    this.renderTable(res.data || res.Data);
                    
                   
                }
            } catch (error) {
                console.error("Lỗi load thùng rác người dùng:", error);
                Swal.fire('Lỗi!', 'Không thể tải danh sách người dùng.', 'error');
            }
        },

        renderTable: function(data) {
            const tbody = document.getElementById('user-trash-table-body');
            if (!tbody) return;

            let html = '';
            if (!data || data.length === 0) {
                html = '<tr><td colspan="7" class="text-center py-5 text-muted">Thùng rác trống</td></tr>';
            } else {
                data.forEach(item => {
                    html += `
                    <tr>
                        <td class="ps-4">
                        <input class="form-check-input item-check" type="checkbox" value="${item.id}">
                        </td>
                        <td class="text-muted">#${item.id}</td>
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${item.avatarUrl || '../assets/img/default-avatar.png'}" class="user-avatar me-2">
                                <span class="fw-medium">${item.fullName}</span>
                            </div>
                        </td>
                        <td>${item.email}</td>
                        <td>
                            ${(() => {
                                const role = (item.roleName || '').toLowerCase().trim();
                                
                                if (role === 'teacher') {
                                    return `<span class="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">Giảng viên</span>`;
                                } 
                                if (role === 'student') {
                                    return `<span class="badge bg-info-subtle text-info border border-info-subtle px-2 py-1">Học viên</span>`;
                                }
                                
                                return `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">${item.roleName}</span>`;
                            })()}
                        </td>
                        <td class="text-muted">${new Date(item.updatedAt).toLocaleDateString('vi-VN')}</td>
                       
                        <td class="text-center">
                            <button class="btn-action btn-restore me-1" onclick="Manager.trash.restore(${item.id})" title="Khôi phục">
                                <i class="bi bi-arrow-counterclockwise"></i>
                            </button>
                            <button class="btn-action btn-delete-forever" onclick="Manager.trash.hardDelete(${item.id})" title="Xóa vĩnh viễn">
                                <i class="bi bi-trash3-fill"></i>
                            </button>
                        </td>
                    </tr>`;
                });
            }
            tbody.innerHTML = html;
        },

      restore: function(id) {
        Swal.fire({
            title: 'Khôi phục tài khoản?',
            text: "Người dùng này sẽ quay lại danh sách hiển thị chính.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH KHI GỌI API KHÔI PHỤC
                    GlobalLoader.show();

                    const response = await fetch(`${Manager.config.apiUrl}/restore/${id}`, { 
                        method: 'POST',
                        headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
                    });
                    const res = await response.json();
                    
                    if (res.success || res.Success) {
                        Toast.fire({ icon: 'success', title: 'Đã khôi phục người dùng thành công.' });
                        this.loadData(1);
                    } else {
                        Toast.fire({ icon: 'error', title: res.message || res.Message || 'Khôi phục thất bại.' });
                    }
                } catch (error) {
                    console.error(error);
                    Toast.fire({ icon: 'error', title: 'Lỗi kết nối máy chủ.' });
                } finally {
                    GlobalLoader.hide();
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
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xóa ngay',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH KHI GỌI API XÓA VĨNH VIỄN
                    GlobalLoader.show();

                    const response = await fetch(`${Manager.config.apiUrl}/hard-delete/${id}`, { 
                        method: 'DELETE',
                        headers: { "Authorization": "Bearer " + localStorage.getItem("jwt_token") }
                    });
                    const res = await response.json();
                    
                    if (res.success || res.Success) {
                        Toast.fire({ icon: 'success', title: 'Tài khoản đã bị xóa vĩnh viễn.' });
                        this.loadData(1);
                    } else {
                        Toast.fire({ icon: 'error', title: res.message || res.Message || 'Xóa vĩnh viễn thất bại.' });
                    }
                } catch (error) {
                    console.error(error);
                    Toast.fire({ icon: 'error', title: 'Lỗi kết nối máy chủ.' });
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
            title: `Khôi phục ${ids.length} người dùng?`,
            text: "Các tài khoản được chọn sẽ hoạt động trở lại bình thường.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1976d2',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Đồng ý khôi phục',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH KHI KHÔI PHỤC HÀNG LOẠT
                    GlobalLoader.show();

                    const response = await fetch(`${Manager.config.apiUrl}/restore-bulk`, {
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
                        Toast.fire({ 
                            icon: 'success', 
                            title: res.message || res.Message || `Đã khôi phục thành công ${ids.length} tài khoản.` 
                        });
                        if (typeof Manager.uncheckAll === 'function') Manager.uncheckAll(); 
                        this.loadData(1);    
                    } else {
                        Toast.fire({ icon: 'error', title: res.message || res.Message || 'Có lỗi xảy ra.' });
                    }
                } catch (error) {
                    console.error("Lỗi restore hàng loạt:", error);
                    Toast.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ.' });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },
resetSearch: function() {
        // 1. Xóa chữ trong ô tìm kiếm thùng rác
        $('#search-user-trash').val('');
        $('#filter-role-trash').val('0');
        if (typeof Manager.uncheckAll === 'function') {
            Manager.uncheckAll();
        }

        // 5. Nạp lại trang đầu tiên của thùng rác (tự động ăn theo TableLoader.show)
        this.loadData(1);
    },
    deleteBulk: function() {
        const ids = this.getSelectedIds();
        if (ids.length === 0) return;

        Swal.fire({
            title: `Xóa vĩnh viễn ${ids.length} mục?`,
            text: "Dữ liệu người dùng sẽ bị xóa sạch hoàn toàn, hành động này không thể hoàn tác!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xóa sạch ngay',
            cancelButtonText: 'Hủy'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // KHÓA MÀN HÌNH KHI XÓA HÀNG LOẠT VĨNH VIỄN
                    GlobalLoader.show();

                    const response = await fetch(`${Manager.config.apiUrl}/hard-delete-bulk`, {
                        method: 'DELETE', 
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + localStorage.getItem("jwt_token")
                        },
                        body: JSON.stringify(ids)
                    });
                    const res = await response.json();
                    
                    if (res.success || res.Success) {
                        Toast.fire({ icon: 'success', title: `Đã xóa vĩnh viễn ${ids.length} mục thành công.` });
                        if (typeof Manager.uncheckAll === 'function') Manager.uncheckAll(); 
                        this.loadData(1);
                    } else {
                        Toast.fire({ icon: 'error', title: res.message || res.Message || 'Có lỗi xảy ra.' });
                    }
                } catch (error) {
                    console.error("Lỗi xóa hàng loạt vĩnh viễn:", error);
                    Toast.fire({ icon: 'error', title: 'Không thể kết nối đến máy chủ.' });
                } finally {
                    GlobalLoader.hide();
                }
            }
        });
    },
        getSelectedIds: function() {
            return Array.from($('.item-check:checked')).map(cb => parseInt($(cb).val()));
        },
          showPaging: function(totalCount, currentPage) {
            const totalPages = Math.ceil(totalCount / Manager.config.pageSize);
            $('#paging-ul').twbsPagination('destroy');
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
$(document).ready(function () {
    // 1. Lấy tham số openId từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const userIdToOpen = urlParams.get('openId');

    if (userIdToOpen) {
        // 2. Gọi ngay cái hàm bác vừa đưa
        // Giả sử đối tượng của bác là User (vd: User.openDetail)
        Manager.openDetail(userIdToOpen);

        // 3. Xóa tham số trên URL cho sạch (Tùy chọn)
        // Việc này giúp khi F5 trang, nó không hiện lại Modal đó nữa
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
});

