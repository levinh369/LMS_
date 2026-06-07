namespace LMS.DTOs.Request
{
    public class ForgotPasswordRequest
    {
        public string Email { get; set; }
    }
    public class VerifyOtpRequest
    {
        public string Email { get; set; }
        public string OtpCode { get; set; }
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; }
        public string OtpCode { get; set; }
        public string NewPassword { get; set; }
    }
}
