using LMS.Services.Interfaces;
using MailKit.Net.Smtp; 
using MailKit.Security;
using MimeKit;         

namespace LMS.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
        {
            var fromEmail = _config["EmailSettings:SenderEmail"];
            var password = _config["EmailSettings:AppPassword"];
            var host = _config["EmailSettings:Host"]; 
            var port = int.Parse(_config["EmailSettings:Port"]);

            var email = new MimeMessage();
            email.From.Add(new MailboxAddress("LMS Admin", fromEmail));
            email.To.Add(MailboxAddress.Parse(toEmail));
            email.Subject = subject;

            // Xây dựng body email
            var builder = new BodyBuilder { HtmlBody = htmlMessage };
            email.Body = builder.ToMessageBody();
            using var smtp = new SmtpClient();

            try
            {
                // Kết nối tới SMTP Server
                await smtp.ConnectAsync(host, port, SecureSocketOptions.StartTls);

                // Đăng nhập
                await smtp.AuthenticateAsync(fromEmail, password);

                // Gửi email
                await smtp.SendAsync(email);
            }
            catch (Exception ex)
            {
                // Log lỗi ra console hoặc hệ thống log của bạn
                Console.WriteLine($"Lỗi gửi email: {ex.Message}");
                throw; // Đẩy lỗi lên Service gọi nó
            }
            finally
            {
                // Ngắt kết nối để giải phóng tài nguyên
                await smtp.DisconnectAsync(true);
            }
        }
    }
}