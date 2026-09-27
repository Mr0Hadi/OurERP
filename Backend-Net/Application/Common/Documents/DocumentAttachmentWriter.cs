using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Documents
{
    /// <summary>
    /// Attachments of a sale, purchase or return are replaced wholesale, never merged - the frontend always sends the final
    /// list. Shared by Create/Update and the Update*Attachments commands that stay open after the document is issued.
    /// Keys go through NormalizeKey so an image URL echoed back by the frontend is stored as the bare bucket key.
    /// </summary>
    public static class DocumentAttachmentWriter
    {
        /// <summary>
        /// The read side: a document's attachments, oldest first, each with a display URL. Shared by the purchase,
        /// sale and both return detail readers so all four return the same shape.
        /// </summary>
        public static async Task<List<DocumentAttachmentDto>> ReadAsync(
            IWMSDbContext context,
            IObjectStorageService objectStorageService,
            DocumentKindEnum kind,
            int documentId,
            CancellationToken cancellationToken)
        {
            var attachments = await context.DocumentAttachments.AsNoTracking()
                .Where(a => a.DocumentKind == kind && a.DocumentId == documentId)
                .OrderBy(a => a.Id)
                .Select(a => new DocumentAttachmentDto
                {
                    Id = a.Id,
                    ObjectKey = a.ObjectKey,
                    FileName = a.FileName,
                    Note = a.Note,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync(cancellationToken);
            foreach (var attachment in attachments)
                attachment.Url = objectStorageService.GetFixedUrl(attachment.ObjectKey);
            return attachments;
        }

        public static async Task ReplaceAsync(
            IWMSDbContext context,
            IObjectStorageService objectStorageService,
            DocumentKindEnum kind,
            int documentId,
            IEnumerable<DocumentAttachmentInputDto> attachments,
            CancellationToken cancellationToken)
        {
            var existing = await context.DocumentAttachments
                .Where(a => a.DocumentKind == kind && a.DocumentId == documentId)
                .ToListAsync(cancellationToken);
            context.DocumentAttachments.RemoveRange(existing);

            await AddAsync(context, objectStorageService, kind, documentId, attachments, cancellationToken);
        }

        public static async Task AddAsync(
            IWMSDbContext context,
            IObjectStorageService objectStorageService,
            DocumentKindEnum kind,
            int documentId,
            IEnumerable<DocumentAttachmentInputDto> attachments,
            CancellationToken cancellationToken)
        {
            foreach (var attachment in attachments)
            {
                await context.DocumentAttachments.AddAsync(new Domain.Entities.DocumentAttachment
                {
                    DocumentKind = kind,
                    DocumentId = documentId,
                    ObjectKey = objectStorageService.NormalizeKey(attachment.ObjectKey) ?? attachment.ObjectKey,
                    FileName = attachment.FileName,
                    Note = attachment.Note,
                    CreatedAt = DateTime.Now,
                }, cancellationToken);
            }
        }
    }
}
