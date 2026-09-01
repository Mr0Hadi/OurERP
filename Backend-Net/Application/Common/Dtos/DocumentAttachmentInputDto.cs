namespace Application.Common.Dtos
{
    /// <summary>Write shape of an attachment on Create/Update - see docs/invoice-attachment-requirements.fa.md §3.</summary>
    public class DocumentAttachmentInputDto
    {
        public string ObjectKey { get; set; } = string.Empty;
        public string? FileName { get; set; }
        public string? Note { get; set; }
    }
}
