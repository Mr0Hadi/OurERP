using Domain.Entities;
using Domain.Enums;

namespace Application.Common.Documents
{
    /// <summary>
    /// The one definition of an invoice line's amounts and of a document's total. Pure in-memory math, so synchronous.
    ///
    /// All amounts are whole rials. Per line:
    ///   Gross    = Quantity x UnitPrice                      (exact - both are integers)
    ///   Discount = round(Gross x Discount% / 100)
    ///   Net      = Gross - Discount
    ///   Tax      = round(Net x TaxPercent / 100)             (0 on an EXEMPT line)
    ///   Total    = Net + Tax
    /// and the document total is the plain sum of the line totals.
    ///
    /// Rounding happens only where a percentage is applied, to the nearest rial with halves away from zero (0.5 -> 1, what a
    /// calculator, Excel and an accountant do; C#'s default banker's rounding would turn 2.5 into 2). It happens per line so
    /// every printed row adds up to the printed total with no "rounding difference" row. Tax is charged on the discounted
    /// amount. The frontend previews with the same rule; the stored numbers are the ones that count.
    /// </summary>
    public static class InvoiceLineMath
    {
        public static ulong RoundRial(decimal value) => (ulong)Math.Round(value, 0, MidpointRounding.AwayFromZero);

        /// <summary>The tax percent a line of this product carries: the product's rate, or 0 when it is exempt.</summary>
        public static int TaxPercentOf(TaxCategoryEnum category, int productTaxPercent) =>
            category == TaxCategoryEnum.EXEMPT ? 0 : productTaxPercent;

        /// <summary>Takes the product's current tax category and rate, then computes every amount.</summary>
        public static void Stamp(IInvoiceLine line, Product product)
        {
            line.TaxCategory = product.TaxCategory;
            line.TaxPercent = TaxPercentOf(product.TaxCategory, product.Tax);
            Recompute(line);
        }

        /// <summary>Keeps the line's own tax snapshot and recomputes the amounts from it.</summary>
        public static void Recompute(IInvoiceLine line)
        {
            var gross = checked((ulong)line.Quantity * line.UnitPrice);
            var discount = RoundRial(gross * (decimal)line.Discount / 100m);
            var net = gross - discount;
            var tax = RoundRial(net * (decimal)line.TaxPercent / 100m);

            line.GrossAmount = gross;
            line.DiscountAmount = discount;
            line.NetAmount = net;
            line.TaxAmount = tax;
            line.TotalAmount = checked(net + tax);
        }

        /// <summary>
        /// The share of a line's total (tax included) that <paramref name="quantity"/> of its units carry, rounded half up -
        /// what closing a line short takes off the invoice.
        /// </summary>
        public static ulong ShareOfTotal(ulong lineTotal, int lineQuantity, int quantity) =>
            lineQuantity <= 0 || quantity <= 0 ? 0UL : RoundRial(lineTotal * (decimal)quantity / lineQuantity);

        public static ulong DocumentTotal(IEnumerable<IInvoiceLine> lines) =>
            lines.Aggregate(0UL, (sum, line) => checked(sum + line.TotalAmount));
    }
}
