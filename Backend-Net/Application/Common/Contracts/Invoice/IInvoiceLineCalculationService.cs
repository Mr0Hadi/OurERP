using Application.Common.Contracts.Documents;

namespace Application.Common.Contracts.Invoice
{
    /// <summary>
    /// Neither Sale/Purchase nor their items persist a computed line total anywhere in the
    /// codebase (CreateSaleCommand/CreatePurchaseCommand take TotalAmount as client-supplied
    /// input) - Discount and Product.Tax are plain <c>int</c> fields, unlike every money field
    /// in this project which is UInt64, so they read as percentages (0-100) rather than flat
    /// amounts. This is the one place that turns them into a printed line total, for invoice
    /// rendering only; it does not feed back into Sale.TotalAmount or any other persisted value.
    /// </summary>
    public interface IInvoiceLineCalculationService
    {
        InvoiceLineModel BuildLine(int rowNumber, string productCode, string productName, int quantity, ulong unitPrice, int discountPercent, int taxPercent);
    }
}
