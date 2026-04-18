using LMS.DTOs.Respone;
using LMS.Enums;
using LMS.Models;

namespace LMS.Repositories.Interfaces
{
    public interface ICommentRepository
    {
        Task<List<CommentModel>> GetByComment(int lessonId, int userId);
        Task AddAsync(CommentModel comment);
        Task DeleteAsync(int id, int userId);
        Task<bool> SoftDeleteAsync(int commentId);
        Task<ReactionResultDTO> HandleReactionAsync(int userId, int commentId, ReactionTypeEnum type);
        Task<int> GetLikeCountAsync(int commentId);
        Task<List<CommentReactionDetailResponseDTO>> GetReactionDetailsAsync(int commentId);
        Task<bool> EditCommentAsync(int commentId, string newComment, int userId);
        Task<bool> DeleteCommentAsync(int commentId, int userId);
        Task<CommentLikeModel?> GetReactionAsync(int commentId, int userId);
        Task DeleteReactionAsync(CommentLikeModel like);
        Task AddReactionAsync(CommentLikeModel like);
        Task <CommentModel?> GetCommentByIdAsync(int id);
        Task<(List<AdminCommentResponseDTO> Items, int TotalCount)> GetAdminCommentsAsync(int pageIndex, int? courseId, string? search, string status);
        Task<bool> ToggleHideCommentAsync(int id);
        Task<bool> RestoreAsync(int id);
    }
}
