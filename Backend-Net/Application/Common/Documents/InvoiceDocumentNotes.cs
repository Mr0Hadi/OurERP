using Application.Common.Contracts.Documents;
using Common.Extensions;

namespace Application.Common.Documents
{
    /// <summary>
    /// The notes of a printed document, one per line, without its description: the installment charge with what is payable in
    /// total, the payment due date, then the document's own notes. The official template prints exactly these in its notes cell,
    /// and the print-data endpoints return exactly these, so the two never differ. Pure text work, synchronous.
    /// </summary>
    public static class InvoiceDocumentNotes
    {
        public static List<string> For(InvoiceDocumentModel model)
        {
            var notes = new List<string>();

            if (model.PayableAmount.HasValue)
                notes.Add("سود اقساط: " + Money(model.InstallmentChargeAmount ?? 0UL) + " " + model.Company.Currency
                    + " - جمع قابل پرداخت: " + Money(model.PayableAmount.Value) + " " + model.Company.Currency);

            if (model.PaymentDueDate.HasValue)
                notes.Add("مهلت پرداخت: " + PersianDate.ToDisplayString(model.PaymentDueDate.Value).ToPersianDigits());

            notes.AddRange(model.Notes.Where(n => !string.IsNullOrWhiteSpace(n)));
            return notes;
        }

        private static string Money(ulong value) => value.ToString("N0").ToPersianDigits();
    }
}
