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
    baseUrl: 'http://127.0.0.1:5000/api/Rank',
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
        try {
            const response = await fetch(`${this.baseUrl}/dashboard`);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();

            // Đổ dữ liệu vào Widgets
            this.updateWidgets(data);

            // Đổ dữ liệu vào Table
            this.renderTable(data.rankConfigs);

            // Cập nhật Switch
            const autoSwitch = document.getElementById('autoRankSwitch');
            if (autoSwitch) autoSwitch.checked = data.isAutoRankingEnabled;

        } catch (error) {
            console.error('Lỗi load dashboard:', error);
            // Toast.error("Không thể tải dữ liệu hạng"); // Nếu bác có dùng thư viện Toast
        }
    },

    // 2. Cập nhật các con số trên thẻ thống kê
    updateWidgets: function (data) {
        // Cập nhật số liệu dựa trên cấu trúc HTML bác đã có
        document.querySelector('.card.border-primary .h5').innerText = data.totalTeachers;
        document.querySelector('.card.border-success .h5').innerText = this.formatCurrency(data.monthlyPlatformRevenue);
        
        const highRankCount = data.rankConfigs
            .filter(r => r.rankEnum >= 2)
            .reduce((sum, r) => sum + r.teacherCount, 0);
            
        document.querySelector('.card.border-warning .h5').innerText = highRankCount;
        document.querySelector('.card.border-info .h5').innerText = data.pendingRankRequests;
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
            const response = await fetch(`${this.baseUrl}/ranks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Parse JSON để lấy nội dung từ Backend
            const result = await response.json();

            if (response.ok) {
                // Hiện Toast thông báo thành công màu xanh
                Toast.fire({
                    icon: 'success',
                    title: result.message || 'Cập nhật thành công!'
                });
                
                this.loadDashboard(); // Refresh lại số liệu
            } else {
                Toast.fire({
                    icon: 'error',
                    title: result.message || 'Cập nhật thất bại. Vui lòng kiểm tra lại!'
                });
            }
        } catch (error) {
            console.error("Lỗi:", error);
            Toast.fire({
                icon: 'error',
                title: 'Lỗi kết nối đến server!'
            });
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
            const response = await fetch(`${this.baseUrl}/teachers-by-rank?rank=${rankEnum}`);
            const teachers = await response.json();

            tbody.innerHTML = teachers.length > 0 ? teachers.map(u => `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${u.avatarUrl || '../assets/img/default-avatar.png'}" class="rounded-circle me-2" width="30" height="30" style="object-fit:cover">
                            <span class="small fw-bold">${u.fullName}</span>
                        </div>
                    </td>
                    <td class="small text-muted">${u.email}</td>
                    <td class="small fw-bold text-success">${this.formatCurrency(u.totalRevenue)}</td>
                    <td class="text-end">
                        <a href="/pages/managerUser/index.html?openId=${u.userId}" class="btn btn-sm btn-light border">
                            <i class="bi bi-arrow-right"></i>
                        </a>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="4" class="text-center p-4">Không có giảng viên nào</td></tr>';

        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Lỗi tải danh sách</td></tr>';
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