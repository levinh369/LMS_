using LMS.DTOs.Request;
using LMS.DTOs.Respone;
using LMS.Enums;
using Microsoft.AspNetCore.Components.Web;

namespace LMS.Services.Interfaces
{
    public interface ICommentService
    {
        Task<bool> AddAsync(CommentRequestDTO dto, int userId, string userName);
        Task <bool> DeleteAsync(int commentId);
        Task<bool> RestoreAsync(int commentId);
        Task<List<CommentResponseDTO>> GetCommentListAsync(int lessonId, int userId);
        Task<ReactionResultDTO> HandleLike(int userId, int commentId, ReactionTypeEnum type);
        Task<List<CommentReactionDetailResponseDTO>> GetReactionDetailServiceAsync(int commentId);
        Task<bool> EditCommentAsync(int commentId, string newComment, int userId);
        Task<bool> DeleteCommentAsync(int commentId, int userId);
        Task<(List<AdminCommentResponseDTO> Items, int TotalCount)> GetAdminCommentsAsync(int pageIndex, int? courseId, string? search, string status);
        Task<bool> ToggleHideCommentAsync(int id);

    }
}
