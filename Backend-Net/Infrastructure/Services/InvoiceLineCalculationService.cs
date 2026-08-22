using Application.Common.Contracts.Documents;
using Application.Common.Contracts.Invoice;

namespace Infrastructure.Services
{
    public class InvoiceLineCalculationService : IInvoiceLineCalculationService
    {
        public InvoiceLineModel BuildLine(int rowNumber, string productCode, string productName, int quantity, ulong unitPrice, int discountPercent, int taxPercent)
        {
            var baseAmount = (ulong)quantity * unitPrice;
            var discountAmount = baseAmount * (ulong)discountPercent / 100UL;
            var taxableAmount = baseAmount - discountAmount;
            var taxAmount = taxableAmount * (ulong)taxPercent / 100UL;

            return new InvoiceLineModel
            {
                RowNumber = rowNumber,
                ProductCode = productCode,
                ProductName = productName,
                Quantity = quantity,
                UnitPrice = unitPrice,
                DiscountAmount = discountAmount,
                TaxAmount = taxAmount,
                LineTotal = taxableAmount + taxAmount,
            };
        }
    }
}
