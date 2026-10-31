namespace Domain.Entities
{
    /// <summary>
    /// The last number handed out for one kind of official document number (sale invoice, purchase return, sale return).
    /// Written only by IWMSDbContext.NextDocumentNumberAsync - one locked statement that increments and returns the value -
    /// never through the change tracker, so it is not audited and two requests can never draw the same number
    /// (frontend-requests 9.10). Before this the numbers were "row count + 1", which counted unnumbered proformas and
    /// skipped deleted rows, so they collided and jumped.
    /// </summary>
    public class DocumentNumberCounter
    {
        /// <summary>One of Application.Common.Documents.DocumentNumbers' keys. Persisted: never rename.</summary>
        public string Key { get; set; } = null!;

        public int LastValue { get; set; }
    }
}
