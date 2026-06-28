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
const Rank = {
    baseUrl: 'https://lms-u2jn.onrender.com/api/Rank',
    init: function () {
        this.loadDashboard();
        this.registerEvents();
    },

    // Đăng ký các sự kiện tĩnh (ví dụ: nút bấm, search nếu có)
    registerEvents: function () {
        // Ví dụ: Bắt sự kiện thay đổi nút Switch tự động nâng hạng
        const autoSwitch = document.getElementById('autoRankSwitch');
        if (autoSwitch) {
            autoSwitch.addEventListener('change', (e) => {
                this.toggleAutoRanking(e.target.checked);
            });
        }
    },

    // 1. Load dữ liệu tổng hợp cho trang quản lý
  loadDashboard: async function () {
    const userInfoRaw = localStorage.getItem("user_info");
    if (userInfoRaw) {
        const user = JSON.parse(userInfoRaw);
        const roleId = parseInt(user.roleId || user.role);
        
        if (roleId !== 1) { 
            // Nếu không phải Admin, đá về trang 403 hoặc trang Dashboard của Teacher luôn
            window.location.href = "/403.html"; 
            return; // Dừng toàn bộ luồng xử lý bên dưới ngay lập tức
        }
    } else {
        // Trường hợp không có cả user_info trong localStorage thì bắt đăng nhập lại
        window.location.href = "/auth/login.html";
        return;
    }
    try {
        // 📍 1. Lấy Token từ kho
        const token = localStorage.getItem("jwt_token");

        // 📍 2. Chuyển sang $.ajax để hệ thống tự động kẹp vé thông hành
        const data = await $.ajax({
            url: `${this.baseUrl}/dashboard`,
            type: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        // $.ajax đã trả về object 'data' (JSON đã parse) nên xài luôn
        // Đổ dữ liệu vào Widgets
        this.updateWidgets(data);

        // Đổ dữ liệu vào Table
        this.renderTable(data.rankConfigs);

        // Cập nhật Switch
        const autoSwitch = document.getElementById('autoRankSwitch');
        if (autoSwitch) autoSwitch.checked = data.isAutoRankingEnabled;

    } catch (error) {
        console.error('Lỗi load dashboard:', error);
        
        // Bắt lỗi 401 để báo người dùng biết
        if (error.status === 401) {
            console.warn("Phiên đăng nhập hết hạn khi load dashboard!");
        } else {
            // Toast.error("Không thể tải dữ liệu hạng"); 
        }
    }
},

    // 2. Cập nhật các con số trên thẻ thống kê
   updateWidgets: function (data) {
        // 1. Tổng Giảng viên 
        document.getElementById('widget-total-teachers').innerText = data.totalTeachers;

        // 2. Lợi nhuận sàn tháng này 
        document.getElementById('widget-monthly-profit').innerText = this.formatCurrency(data.monthlyPlatformRevenue);
        
        // 3. Hạng Vàng/KC (Lấy thẳng từ Backend trả về, không cần tính lại)
        document.getElementById('widget-high-rank').innerText = data.vipTeachersCount;
        
        // 4. Giảng viên mới trong tháng 
        document.getElementById('widget-new-teachers').innerText = data.newTeachersThisMonth;
    },
    // 3. Render bảng danh sách Rank
    renderTable: function (configs) {
        const tbody = document.getElementById('rank-table-body');
        if (!tbody) return;

        tbody.innerHTML = configs.map(rank => `
            <tr>
                <td>
                    <span class="fw-bold text-dark">${rank.rankName}</span><br>
                    <small class="text-muted">${this.getRankDesc(rank.rankEnum)}</small>
                </td>
                <td>
                    <div class="rank-card-icon ${this.getRankClass(rank.rankEnum)}">
                        <i class="bi ${rank.rankEnum === 3 ? 'bi-gem' : 'bi-award-fill'}"></i>
                    </div>
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm ${rank.rankEnum === 0 ? 'bg-light' : ''}" 
                           value="${rank.requiredRevenue}" 
                           ${rank.rankEnum === 0 ? 'disabled' : ''} 
                           id="revenue-${rank.rankId}">
                </td>
                <td>
                    <div class="input-group input-group-sm w-75">
                        <input type="number" class="form-control fw-bold" value="${rank.defaultRate}" id="rate-${rank.rankId}">
                        <span class="input-group-text">%</span>
                    </div>
                </td>
                <td class="text-center">
                    <span class="badge rounded-pill badge-view-user" 
                          onclick="Rank.showTeacherList(${rank.rankEnum}, '${rank.rankName}')">
                        ${rank.teacherCount} người <i class="bi bi-eye ms-1"></i>
                    </span>
                </td>
                <td class="text-end">
                    <button class="btn btn-save btn-sm px-3" onclick="Rank.saveConfig(${rank.rankId})">
                        <i class="bi bi-save me-1"></i> Lưu
                    </button>
                </td>
            </tr>
        `).join('');
    },

   saveConfig: async function (id) {
        const revenue = document.getElementById(`revenue-${id}`).value;
        const rate = document.getElementById(`rate-${id}`).value;

        const payload = {
            requiredRevenue: parseFloat(revenue),
            defaultRate: parseInt(rate)
        };

        try {
            GlobalLoader.show();
            
            // 📍 1. Lấy Token từ kho
            const token = localStorage.getItem("jwt_token");

            // 📍 2. Dùng $.ajax để tự động kẹp vé thông hành
            const result = await $.ajax({
                url: `${this.baseUrl}/ranks/${id}`,
                type: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(payload),
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            // Nếu $.ajax thành công, 'result' đã là object JSON rồi
            Toast.fire({
                icon: 'success',
                title: result.message || 'Cập nhật thành công!'
            });
            
            this.loadDashboard(); // Refresh lại số liệu
            
        } catch (error) {
            console.error("Lỗi:", error);
            
            // 📍 Xử lý báo lỗi chi tiết
            let errorMsg = 'Lỗi kết nối đến server!';
            if (error.responseJSON && error.responseJSON.message) {
                errorMsg = error.responseJSON.message;
            } else if (error.status === 401) {
                errorMsg = 'Phiên đăng nhập hết hạn!';
            }

            Toast.fire({
                icon: 'error',
                title: errorMsg
            });
        } finally {
            GlobalLoader.hide();
        }
    },
    // 5. Mở Modal và load danh sách giảng viên
    showTeacherList: async function (rankEnum, rankName) {
    const modal = new bootstrap.Modal(document.getElementById('teacherListModal'));
    document.getElementById('modalRankName').innerText = rankName;
    const tbody = document.getElementById('modalTeacherTableBody');
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
    modal.show();

    try {
        // 📍 1. Lấy Token từ kho
        const token = localStorage.getItem("jwt_token");

        // 📍 2. Chuyển sang $.ajax và kẹp vé thông hành
        const teachers = await $.ajax({
            url: `${this.baseUrl}/teachers-by-rank?rank=${rankEnum}`,
            type: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        // 📍 3. Render dữ liệu
        tbody.innerHTML = teachers.length > 0 ? teachers.map(u => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${u.avatarUrl || '/assets/img/default-avatar.png'}" 
                             class="rounded-circle me-2" width="30" height="30" style="object-fit:cover"
                            onerror="this.onerror=null; this.src='../assets/img/default-avatar.png';">
                        <span class="small fw-bold">${u.fullName}</span>
                    </div>
                </td>
                <td class="small text-muted">${u.email}</td>
                <td class="small fw-bold text-success">${this.formatCurrency(u.totalRevenue)}</td>
                <td class="text-end">
                    <a href="/managerUser/index.html?openId=${u.userId}" class="btn btn-sm btn-light border">
                        <i class="bi bi-arrow-right"></i>
                    </a>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="4" class="text-center p-4">Không có giảng viên nào</td></tr>';

    } catch (error) {
        console.error("Lỗi tải danh sách giảng viên:", error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Lỗi tải danh sách</td></tr>';
        
        if (error.status === 401) {
            console.warn("Token hết hạn khi tải danh sách giảng viên.");
        }
    }
},
    // Helpers
    formatCurrency: function (value) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    },

    getRankClass: function (enumVal) {
        const classes = {
            0: 'bg-orange-subtle text-warning', // Bronze
            1: 'bg-secondary-subtle text-secondary', // Silver
            2: 'bg-warning-subtle text-warning', // Gold
            3: 'bg-info-subtle text-info' // Diamond
        };
        return classes[enumVal] || 'bg-light';
    },

    getRankDesc: function (enumVal) {
        const descs = { 0: 'Mặc định', 1: 'Tiềm năng', 2: 'Đối tác VIP', 3: 'Bậc thầy' };
        return descs[enumVal] || '';
    }
};

Rank.init();