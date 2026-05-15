using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;
using Microsoft.AspNetCore.Components.Web;
using static LMS.Controllers.CommentController;

namespace LMS.Services.Interfaces
{
    public interface ICommentService
    {
        Task<CommentResponseDTO?> AddAsync(CommentRequestDTO dto, int userId, string userName);
        Task <bool> DeleteAsync(int commentId);
        Task<bool> RestoreAsync(int commentId);
        Task<List<CommentResponseDTO>> GetCommentListAsync(int lessonId, int userId);
        Task<ReactionResultDTO> HandleLike(int userId, int commentId, ReactionTypeEnum type);
        Task<List<CommentReactionDetailResponseDTO>> GetReactionDetailServiceAsync(int commentId);
        Task<bool> EditCommentAsync(int commentId, string newComment, int userId);
        Task<bool> DeleteCommentAsync(int commentId, int userId);
        Task<(List<AdminCommentResponseDTO> Items, int TotalCount)> GetAdminCommentsAsync(int pageIndex, int? courseId, int? lessonId, string? search, string status, int? teacherId);
        Task<bool> ToggleHideCommentAsync(int id);
        Task<bool> ProcessPinAsync(PinRequest request, int adminId, string adminName);
        Task HardDeleteAsync(int id);
        Task<object> GetParentCommentsPaginatedAsync(int lessonId, int userId, int page, int pageSize);
        Task<object> GetRepliesPaginatedAsync(int parentId,int lessionId, int userId, int page, int pageSize);

    }
}