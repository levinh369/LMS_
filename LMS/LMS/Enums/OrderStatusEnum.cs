namespace LMS.Enums
{
    public enum OrderStatusEnum
    {
            Pending = 0,    // Đang chờ (Mặc định khi tạo)
            Success = 1,    // Thanh toán thành công
            Failed = 2,     // Lỗi thanh toán
            Cancelled = 3,  // Người dùng chủ động hủy
            Refunded = 4    // Đã hoàn tiền
        
    }
}
