const GlobalLoader = {
    // 1. Giao diện của màn hình Loading (Dùng luôn CSS/Spinner của Bootstrap)
    htmlContent: `
        <div id="app-global-loader" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(255, 255, 255, 0.6); backdrop-filter: blur(3px); z-index: 99999; justify-content: center; align-items: center; flex-direction: column;">
            <div class="spinner-border text-primary shadow-sm" role="status" style="width: 3.5rem; height: 3.5rem; border-width: 0.25em;"></div>
            <div class="mt-3 fw-bold text-primary" style="letter-spacing: 1px; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">ĐANG XỬ LÝ...</div>
        </div>
    `,

    // 2. Tự động tiêm (inject) mã HTML vào thẻ body khi trang vừa load
    init: function () {
        if ($('#app-global-loader').length === 0) {
            $('body').append(this.htmlContent);
        }
    },

    // 3. Hàm bật Loading
    show: function () {
        $('#app-global-loader').css('display', 'flex');
        $('body').css('overflow', 'hidden'); // Vô hiệu hóa cuộn chuột
    },

    // 4. Hàm tắt Loading
    hide: function () {
        $('#app-global-loader').fadeOut(250, function() {
            $(this).css('display', 'none');
            $('body').css('overflow', 'auto'); // Mở lại cuộn chuột
        });
    }
};

// Khởi tạo ngay khi file được nhúng
$(document).ready(function () {
    GlobalLoader.init();
});

// ========================================================

const TableLoader = {
    // 1. Hàm hiện Loading (xoay xoay)
    show: function (selector) {
        $(selector).html(`
            <tr>
                <td colspan="100" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                </td>
            </tr>
        `);
    },

    // 2. Hàm hiện Giao diện "Chưa có dữ liệu" (Trống)
    // FIX: Bỏ tham số colspan đi, ốp cứng 100 luôn cho nhàn
    showEmpty: function (selector, message = "Chưa có dữ liệu.") {
        $(selector).html(`
            <tr>
                <td colspan="100" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 d-block mb-2 opacity-50"></i>
                    ${message}
                </td>
            </tr>
        `);
    },

    // 3. Hàm hiện Giao diện "Lỗi Server"
    // FIX: Bỏ tham số colspan đi, ốp cứng 100
    showError: function (selector, message = "Lỗi tải dữ liệu từ máy chủ!") {
        $(selector).html(`
            <tr>
                <td colspan="100" class="text-center py-5 text-danger fw-semibold">
                    <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
                    ${message}
                </td>
            </tr>
        `);
    },
  
};