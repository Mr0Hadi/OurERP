using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// A sale or purchase line as it appears on the invoice: the inputs the user chose (quantity, unit price, discount
    /// percent) plus the tax snapshot and every amount derived from them, stored so the printed invoice, the API and the
    /// document total all read the same numbers. Written only by InvoiceLineMath.Stamp.
    /// </summary>
    public interface IInvoiceLine
    {
        int Quantity { get; }
        UInt64 UnitPrice { get; }

        /// <summary>Percent, 0-100.</summary>
        int Discount { get; }

        TaxCategoryEnum TaxCategory { get; set; }

        /// <summary>Percent applied to this line; 0 on an EXEMPT line.</summary>
        int TaxPercent { get; set; }

        UInt64 GrossAmount { get; set; }
        UInt64 DiscountAmount { get; set; }
        UInt64 NetAmount { get; set; }
        UInt64 TaxAmount { get; set; }
        UInt64 TotalAmount { get; set; }
    }
}
