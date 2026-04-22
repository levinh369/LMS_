var Home = {
    allCourses: [],
    config: {
        pageSize: 5,
        apiUrl: "http://vinh369-001-site1.site4future.com/api/course",
        apiUrlCate : "http://vinh369-001-site1.site4future.com/api/category",
        apiUrlRoadMap : "http://vinh369-001-site1.site4future.com/api/roadMap"
    },

    // Hàm khởi tạo - Gọi khi trang load xong
    init: function () {
        Home.loadCategories();
        Home.loadData(1);
        Home.initSearchDropdown();
        Home.registerEvents();
    },

    // Đăng ký tất cả sự kiện ở đây (Thay vì viết onclick trong HTML)
    registerEvents: function () {
    
    },
    loadData: async function () {
    try {
        // 1. Chạy song song cả 3 API (Nhanh gấp đôi)
        const [resFree, resPro, resRoadmap] = await Promise.all([
            $.get(`${Home.config.apiUrl}/filter?isFree=true`),
            $.get(`${Home.config.apiUrl}/filter?isFree=false`),
            $.get(`${Home.config.apiUrlRoadMap}/top-roadmaps`)
        ]);
        const freeData = (resFree && resFree.success) ? resFree.data : [];
        const proData = (resPro && resPro.success) ? resPro.data : [];
        const roadmapData = (resRoadmap && resRoadmap.success) ? resRoadmap.data : [];
        Home.allCourses = [...freeData, ...proData];
        Home.renderCourses(freeData, '#freeCourseList');
        Home.renderCourses(proData, '#proCourseList');
        Home.renderRoadmaps(roadmapData);
    } catch (error) {
        console.error("Lỗi sập nguồn rồi bác ơi:", error);
    }
},
renderRoadmaps: function(roadmaps) {
    let html = '';

    if (roadmaps && roadmaps.length > 0) {
        roadmaps.forEach(item => {
           html += `
    <div class="col-md-6 col-lg-3">
        <a href="/road_map/road-map-detail.html?id=${item.id}" class="roadmap-card shadow-sm">
            <div class="roadmap-icon">
                <i class="bi bi-signpost-split-fill"></i>
            </div>
            <span class="step-count">${item.courseCount || 0} khóa học</span>
            <h4>${item.title}</h4>
            <p class="roadmap-desc">
                ${item.description || 'Lộ trình bài bản giúp bác làm chủ kiến thức.'}
            </p>
        </a>
    </div>`;
        });
    }
    $('#roadmapList').html(html);
},
renderCourses: function (data, targetSelector) {
    let html = '';
    
    if (!data || data.length === 0) {
        $(targetSelector).html(`
            <div class="col-12 text-center py-5">
                <img src="https://cdn-icons-png.flaticon.com/512/6134/6134065.png" width="80" class="opacity-25 mb-3">
                <p class="text-muted fw-light">Chưa có khóa học nào bác ơi!</p>
            </div>
        `);
        return;
    }

    data.forEach(item => {
        const isPro = item.price > 0;
        const badgeClass = isPro ? 'bg-warning text-dark' : 'bg-success text-white';
        const badgeText = isPro ? 'PREMIUM' : 'FREE';
        
        const formattedPrice = isPro 
            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)
            : 'Miễn phí';

        html += `
            <div class="col-md-6 col-lg-4 col-xl-3 mb-4">
                <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden position-relative bg-white">
                    
                    <span class="badge ${badgeClass} position-absolute top-0 start-0 m-3 shadow-sm px-3 py-2 rounded-pill" style="z-index: 10; font-size: 10px;">
                        ${badgeText}
                    </span>

                    <div class="ratio ratio-16x9">
                        <img src="${item.thumbnail || 'https://via.placeholder.com/400x225'}" 
                             class="card-img-top object-fit-cover" alt="${item.title}">
                    </div>

                    <div class="card-body p-3 d-flex flex-column">
                        <div class="mb-2">
                            <span class="text-primary fw-bold" style="font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;">
                                ${item.categoryName || 'Lập trình'}
                            </span>
                        </div>
                        
                        <h6 class="card-title fw-bold text-dark mb-3" style="height: 2.8rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4;">
                            ${item.title}
                        </h6>
                        
                        <div class="d-flex align-items-center gap-3 text-muted mb-4" style="font-size: 12px;">
                            <span><i class="bi bi-play-circle me-1"></i>${item.totalLessons} bài</span>
                            <span><i class="bi bi-clock me-1"></i>${item.durationDisplay}</span>
                            <span class="ms-auto"><i class="bi bi-people me-1"></i>${item.studentCount}</span>
                        </div>

                        <div class="mt-auto pt-3 border-top d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center">
                                <img src="${item.instructorAvatar || 'https://ui-avatars.com/api/?background=random&name=' + encodeURIComponent(item.instructorName || 'Expert')}" 
                                     class="rounded-circle border" width="28" height="28" style="object-fit: cover;">
                                <span class="ms-2 fw-medium text-dark" style="font-size: 12px;">${item.instructorName || 'Instructor'}</span>
                            </div>
                            <div class="text-end">
                                <span class="fw-bold ${isPro ? 'text-danger' : 'text-success'}" style="font-size: 15px;">
                                    ${formattedPrice}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="p-3 pt-0">
                        <button onclick="Home.handleGoToDetail(${item.id})" 
                                class="btn btn-dark btn-sm w-100 rounded-pill fw-bold py-2" 
                                style="font-size: 12px;">
                            Xem chi tiết
                        </button>
                    </div>
                </div>
            </div>`;
    });

    $(targetSelector).html(html);
},
loadCategories: async function() {
    try {
        const response = await fetch(Home.config.apiUrlCate);
        const res = await response.json(); 

        if(res.success) {
            let html = '<div class="filter-pill active" onclick="Home.handleFilter(this, \'Tất cả\')">Tất cả</div>';
            res.data.forEach(cat => {
            let name = cat.name || cat.Name;
            html += `<div class="filter-pill" onclick="Home.filterByCategory('${name}')">${name}</div>`;
        });
            
            $('#categoryContainer').html(html); 
        }
    } catch (error) {
        console.error("Lỗi load Cate:", error);
    }
},
filterByCategory: function (categoryName) {
    console.log("Đang lọc theo danh mục:", categoryName);
    $('.filter-pill').removeClass('active');
    $(`.filter-pill:contains('${categoryName}')`).addClass('active');

    let filteredData = [];
    if (categoryName === 'Tất cả') {
        filteredData = Home.allCourses;
    } else {
        filteredData = Home.allCourses.filter(item => {
            // Lưu ý: Kiểm tra kỹ tên thuộc tính là categoryName hay CategoryName
            return item.categoryName === categoryName || item.CategoryName === categoryName;
        });
    }
    
    console.log(filteredData)
    const freeFiltered = filteredData.filter(c => c.price === 0);
    const proFiltered = filteredData.filter(c => c.price > 0);

    Home.renderCourses(freeFiltered, '#freeCourseList');
    Home.renderCourses(proFiltered, '#proCourseList');
    $('html, body').animate({ scrollTop: $('#categoryContainer').offset().top - 100 }, 300);
},
// Hàm xử lý khi bấm nút (vừa đổi màu vừa lọc)
handleFilter: function(el, categoryName) {
    // Đổi màu nút
    $('.filter-pill').removeClass('active');
    $(el).addClass('active');
    
    // Gọi hàm lọc dữ liệu (Bác đã viết ở câu trước)
    Home.filterByCategory(categoryName);
},
initSearchDropdown: function() {
    const $searchBox = $('#courseSearch');
    const $wrapper = $('#searchResultWrapper');
    const $resultList = $('#searchResultList');

    $searchBox.on('input', function() {
        const keyword = $(this).val().toLowerCase().trim();

        if (keyword.length < 1) {
            $wrapper.addClass('d-none');
            return;
        }

        // Lọc dữ liệu
        const matches = Home.allCourses.filter(c => 
            (c.title || "").toLowerCase().includes(keyword)
        ).slice(0, 5); // Chỉ lấy 5 ông đầu tiên cho đỡ dài

        if (matches.length > 0) {
            let html = '';
            matches.forEach(item => {
                html += `
                    <a href="detail.html?id=${item.id}" class="search-item">
                        <img src="${item.thumbnail || 'default.jpg'}" alt="">
                        <div class="title">${item.title}</div>
                    </a>`;
            });
            $resultList.html(html);
            $wrapper.removeClass('d-none');
        } else {
            $resultList.html('<div class="p-3 text-center text-muted small">Không tìm thấy khóa học nào 😅</div>');
            $wrapper.removeClass('d-none');
        }
    });

    // Ẩn bảng kết quả khi bấm ra ngoài
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.search-container').length) {
            $wrapper.addClass('d-none');
        }
    });
},
openLogin: function() {
    // 1. Reset form về trạng thái trắng tinh khôi
    const $form = $('#systemLoginForm');
    if ($form.length) $form[0].reset();

    // 2. Mở Modal
    const modalElement = document.getElementById('loginModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
},
handleGoToDetail: async function(courseId) {
    window.location.href = `/home/detail.html?id=${courseId}`;
}
}
$(document).ready(function() {
    Home.init();
});