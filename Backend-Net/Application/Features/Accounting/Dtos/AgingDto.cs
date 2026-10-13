namespace Application.Features.Accounting.Dtos
{
    /// <summary>
    /// What is still owed, split by how far past due it is (سنی‌بندی). Counted from the due date: PaymentDate, else the
    /// invoice date; an installment counts from its own due date. Amounts are open documents, not the ledger balance.
    /// </summary>
    public class AgingDto
    {
        /// <summary>Not due yet (due today or later).</summary>
        public decimal NotDue { get; set; }
        public decimal Days1To30 { get; set; }
        public decimal Days31To60 { get; set; }
        public decimal Days61To90 { get; set; }
        public decimal Over90Days { get; set; }

        /// <summary>Everything already past due (the four overdue buckets).</summary>
        public decimal Overdue => Days1To30 + Days31To60 + Days61To90 + Over90Days;
        public decimal Total => NotDue + Overdue;

        public void Add(decimal amount, int daysPastDue)
        {
            if (daysPastDue <= 0) NotDue += amount;
            else if (daysPastDue <= 30) Days1To30 += amount;
            else if (daysPastDue <= 60) Days31To60 += amount;
            else if (daysPastDue <= 90) Days61To90 += amount;
            else Over90Days += amount;
        }

        public static AgingDto Of(IEnumerable<OpenItem> items, DateTime today)
        {
            var aging = new AgingDto();
            foreach (var item in items)
                aging.Add(item.Amount, AccountingDocuments.DaysPastDue(item.DueDate, today));
            return aging;
        }
    }
}
