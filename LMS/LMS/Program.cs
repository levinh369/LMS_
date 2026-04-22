using LMS.Configs;
using LMS.Data;
using LMS.Hub;
using LMS.Repositories;
using LMS.Repositories.Interfaces;
using LMS.Services;
using LMS.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.Http; // Thêm dòng này để nhận diện CookieSecurePolicy
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("MyDB")));
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ICourseRepository, CourseRepository>();
builder.Services.AddScoped<ICourseService, CourseService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<IlessonService, LessonService>();
builder.Services.AddScoped<ILessonRepository, LessonRepository>();
builder.Services.AddScoped<IChapterService, ChapterService>();
builder.Services.AddScoped<IChapterRepository, ChapterRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IEnrollRepository, EnrollRepository>();
builder.Services.AddScoped<IUserProgressRepository, UserProgressRepository>();
builder.Services.AddScoped<IRoadMapRepository, RoadMapRepository>();
builder.Services.AddScoped<IRoadMapService, RoadMapService >();
builder.Services.AddScoped<IEnrollmentService, EnrollService>();
builder.Services.AddScoped<ICommentRepository, CommentRepository>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddSignalR();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IDashBoardRepository, DashBoardRepository>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IYoutubeService, YoutubeService>();
builder.Services.AddControllers();
builder.Services.Configure<BunnyNetSettings>(builder.Configuration.GetSection("BunnyNet"));
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin => true) // Cho phép tất cả các nguồn truy cập
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Giữ cái này để dùng được SignalR/Hub
    });
});
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
})
    .AddCookie() // Thêm cái này để lưu trạng thái tạm thời khi đi từ Google về
.AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
{
    options.ClientId = builder.Configuration["Authentication:Google:ClientId"];
    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
    options.ClaimActions.MapJsonKey("picture", "picture");


})
.AddFacebook(options =>
{
    options.AppId = builder.Configuration["Authentication:Facebook:AppId"];
    options.AppSecret = builder.Configuration["Authentication:Facebook:AppSecret"];

    // Facebook bắt buộc phải xin quyền email
    options.Fields.Add("email");
    options.Fields.Add("name");
    options.Fields.Add("picture");

    // "Chia để trị" phần Map ảnh: Facebook trả về object lồng nhau picture -> data -> url
    options.ClaimActions.MapCustomJson("picture", obj =>
        obj.GetProperty("picture").GetProperty("data").GetProperty("url").GetString());
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false, // Tắt đi cho đỡ lỗi lệch domain
        ValidateAudience = false, // Tắt đi cho đỡ lỗi lệch domain
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };

    // --- CHÈN THÊM ĐOẠN NÀY ĐỂ THÔNG LUỒNG SIGNALR ---
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Lấy token từ tham số "access_token" trên URL
            var accessToken = context.Request.Query["access_token"];

            // Kiểm tra xem request có phải đang gọi đến Hub không
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                path.StartsWithSegments("/notificationHub")) // Phải khớp với MapHub bác đặt
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

var app = builder.Build();
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor |
                       Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
});
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapHub<NotificationHub>("/notificationHub");

app.MapControllers();

app.Run();
//





//using LMS.Configs;
//using LMS.Data;
//using LMS.Hub;
//using LMS.Repositories;
//using LMS.Repositories.Interfaces;
//using LMS.Services;
//using LMS.Services.Interfaces;
//using Microsoft.AspNetCore.Authentication;
//using Microsoft.AspNetCore.Authentication.Cookies;
//using Microsoft.AspNetCore.Authentication.Facebook;
//using Microsoft.AspNetCore.Authentication.Google;
//using Microsoft.AspNetCore.Authentication.JwtBearer;
//using Microsoft.EntityFrameworkCore;
//using Microsoft.IdentityModel.Tokens;
//using System.Text;

//var builder = WebApplication.CreateBuilder(args);

//// Add services to the container.
//builder.Services.AddDbContext<ApplicationDbContext>(options =>
//    options.UseSqlServer(builder.Configuration.GetConnectionString("MyDB")));
//builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
//builder.Services.AddScoped<ICategoryService, CategoryService>();
//builder.Services.AddScoped<ICourseRepository, CourseRepository>();
//builder.Services.AddScoped<ICourseService, CourseService>();
//builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
//builder.Services.AddScoped<IlessonService, LessonService>();
//builder.Services.AddScoped<ILessonRepository, LessonRepository>();
//builder.Services.AddScoped<IChapterService, ChapterService>();
//builder.Services.AddScoped<IChapterRepository, ChapterRepository>();
//builder.Services.AddScoped<IAuthService, AuthService>();
//builder.Services.AddScoped<IUserRepository, UserRepository>();
//builder.Services.AddScoped<IUserService, UserService>();
//builder.Services.AddScoped<IEnrollRepository, EnrollRepository>();
//builder.Services.AddScoped<IUserProgressRepository, UserProgressRepository>();
//builder.Services.AddScoped<IRoadMapRepository, RoadMapRepository>();
//builder.Services.AddScoped<IRoadMapService, RoadMapService>();
//builder.Services.AddScoped<IEnrollmentService, EnrollService>();
//builder.Services.AddScoped<ICommentRepository, CommentRepository>();
//builder.Services.AddScoped<ICommentService, CommentService>();
//builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
//builder.Services.AddScoped<IOrderRepository, OrderRepository>();
//builder.Services.AddScoped<IOrderService, OrderService>();
//builder.Services.AddScoped<INotificationService, NotificationService>();
//builder.Services.AddSignalR();
//builder.Services.AddScoped<INotificationService, NotificationService>();
//builder.Services.AddScoped<IDashBoardRepository, DashBoardRepository>();
//builder.Services.AddScoped<IDashboardService, DashboardService>();
//builder.Services.AddHttpClient();
//builder.Services.AddScoped<IYoutubeService, YoutubeService>();
//builder.Services.AddControllers();
//builder.Services.Configure<BunnyNetSettings>(builder.Configuration.GetSection("BunnyNet"));
//// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
//builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();
//builder.Services.AddCors(options =>
//{
//    options.AddPolicy("AllowFrontend", policy =>
//    {
//        policy.WithOrigins("http://127.0.0.1:5500", "http://localhost:5500") // Port của Live Server
//              .AllowAnyHeader()
//              .AllowAnyMethod()
//               .AllowCredentials();
//    });
//});
//builder.Services.AddAuthentication(options =>
//{
//    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
//    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
//    options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
//})
//    .AddCookie() // Thêm cái này để lưu trạng thái tạm thời khi đi từ Google về
//.AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
//{
//    options.ClientId = builder.Configuration["Authentication:Google:ClientId"];
//    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
//    options.ClaimActions.MapJsonKey("picture", "picture");
//})
//.AddFacebook(options =>
//{
//    options.AppId = builder.Configuration["Authentication:Facebook:AppId"];
//    options.AppSecret = builder.Configuration["Authentication:Facebook:AppSecret"];

//    // Facebook bắt buộc phải xin quyền email
//    options.Fields.Add("email");
//    options.Fields.Add("name");
//    options.Fields.Add("picture");

//    // "Chia để trị" phần Map ảnh: Facebook trả về object lồng nhau picture -> data -> url
//    options.ClaimActions.MapCustomJson("picture", obj =>
//        obj.GetProperty("picture").GetProperty("data").GetProperty("url").GetString());
//})
//.AddJwtBearer(options =>
//{
//    options.TokenValidationParameters = new TokenValidationParameters
//    {
//        ValidateIssuer = true,
//        ValidateAudience = true,
//        ValidateLifetime = true,
//        ValidateIssuerSigningKey = true,
//        ValidIssuer = builder.Configuration["Jwt:Issuer"],
//        ValidAudience = builder.Configuration["Jwt:Audience"],
//        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
//    };

//    // --- CHÈN THÊM ĐOẠN NÀY ĐỂ THÔNG LUỒNG SIGNALR ---
//    options.Events = new JwtBearerEvents
//    {
//        OnMessageReceived = context =>
//        {
//            // Lấy token từ tham số "access_token" trên URL
//            var accessToken = context.Request.Query["access_token"];

//            // Kiểm tra xem request có phải đang gọi đến Hub không
//            var path = context.HttpContext.Request.Path;
//            if (!string.IsNullOrEmpty(accessToken) &&
//                path.StartsWithSegments("/notificationHub")) // Phải khớp với MapHub bác đặt
//            {
//                context.Token = accessToken;
//            }
//            return Task.CompletedTask;
//        }
//    };
//});

//var app = builder.Build();

//// 1. Cấu hình Swagger: Luôn bật và cho nhảy vào trang chủ luôn
//app.UseSwagger();
//app.UseSwaggerUI(c =>
//{
//    c.SwaggerEndpoint("/swagger/v1/swagger.json", "LMS API V1");
//    c.RoutePrefix = string.Empty; // Vào link gốc là hiện Swagger luôn, không bị 404 nữa
//});

//// 2. CORS: Sửa lại để cho phép Vercel và các nguồn khác
//app.UseCors(policy =>
//    policy.AllowAnyHeader()
//          .AllowAnyMethod()
//          .SetIsOriginAllowed(origin => true) // Cho phép tất cả các nguồn (để test cho nhanh)
//          .AllowCredentials());

//// 3. Cảnh báo: Tạm thời comment dòng này nếu ông dùng gói Free của SmarterASP 
//// vì gói Free đôi khi không hỗ trợ HTTPS mượt mà, dễ gây lỗi 403/404
//// app.UseHttpsRedirection(); 

//app.UseAuthentication();
//app.UseAuthorization();

//app.MapHub<NotificationHub>("/notificationHub");
//app.MapControllers();

//app.Run();

