using Application.Common.Contracts.Context;
using Common.Extensions;

namespace Application.Common.Documents
{
    /// <summary>
    /// The one place official document numbers are drawn (frontend-requests 9.10). Each kind has its own counter, drawn
    /// under a lock, so two requests can never get the same number and a deleted or still-unnumbered document no longer
    /// shifts the sequence. The format is unchanged ({prefix}-{year}-{seq:D4}); the sequence continues across years, as it
    /// always did.
    /// </summary>
    public static class DocumentNumbers
    {
        // Persisted as DocumentNumberCounter.Key - never rename.
        public const string SaleInvoiceKey = "SaleInvoice";
        public const string PurchaseReturnKey = "PurchaseReturn";
        public const string SaleReturnKey = "SaleReturn";
        public const string StockTransferKey = "StockTransfer";
        public const string StocktakeKey = "Stocktake";

        public static async Task<string> NextSaleInvoiceAsync(IWMSDbContext context, CancellationToken cancellationToken) =>
            Generator.GenerateInvoiceNumber(await context.NextDocumentNumberAsync(SaleInvoiceKey, cancellationToken));

        public static async Task<string> NextPurchaseReturnAsync(IWMSDbContext context, CancellationToken cancellationToken) =>
            Generator.GenerateReturnNumber(await context.NextDocumentNumberAsync(PurchaseReturnKey, cancellationToken));

        public static async Task<string> NextSaleReturnAsync(IWMSDbContext context, CancellationToken cancellationToken) =>
            Generator.GenerateSaleReturnNumber(await context.NextDocumentNumberAsync(SaleReturnKey, cancellationToken));
    }
}
