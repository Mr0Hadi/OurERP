namespace Application.Features.Accounting.Dtos
{
    /// <summary>
    /// Everything the accounting dashboard's tiles and charts show, in one response. Two kinds of figures:
    /// point-in-time (balances, aging, overdue, installments, inventory, pending return money - as of now) and
    /// period (sales, purchases, cash, tax, series - FromDate..ToDate). Sales and purchases are invoice-based:
    /// issued invoices by InvoiceDate. No cost of goods or profit: that is the costing feature.
    /// </summary>
    public class AccountingDashboardDto
    {
        public DateTime FromDate { get; set; }

        /// <summary>Last day of the period (inclusive).</summary>
        public DateTime ToDate { get; set; }
        public DateTime GeneratedAt { get; set; }

        public PartySideBalanceDto Receivables { get; set; } = new();
        public PartySideBalanceDto Payables { get; set; } = new();

        /// <summary>Issued sale invoices dated in the period (the sales journal's footer for the same dates).</summary>
        public JournalSummaryDto Sales { get; set; } = new();
        public JournalSummaryDto Purchases { get; set; } = new();

        /// <summary>Non-voided payment rows paid in the period, by method.</summary>
        public PaymentJournalSummaryDto Cash { get; set; } = new();
        public DashboardTaxDto Tax { get; set; } = new();
        public DashboardOverdueDto OverdueSales { get; set; } = new();
        public DashboardOverdueDto OverduePurchases { get; set; } = new();
        public DashboardInstallmentsDto Installments { get; set; } = new();
        public InventoryValuationSummaryDto Inventory { get; set; } = new();
        public DashboardPendingReturnMoneyDto PendingReturnMoney { get; set; } = new();
        public List<DashboardPeriodDto> Series { get; set; } = new();
    }

    /// <summary>
    /// One side of the party accounts. Receivables: customers' balances. Payables: suppliers' balances. Each side
    /// reads the ledger in its natural direction and reports the opposite direction separately, never netted away.
    /// </summary>
    public class PartySideBalanceDto
    {
        /// <summary>Receivables: what customers owe us. Payables: what we owe suppliers. Always &gt;= 0.</summary>
        public decimal Total { get; set; }

        /// <summary>Parties with a balance in that natural direction.</summary>
        public int PartyCount { get; set; }

        /// <summary>The opposite direction. Receivables: what we owe customers (overpayments, on-account credit). Payables: what suppliers owe us (refunds due).</summary>
        public decimal OppositeTotal { get; set; }
        public int OppositePartyCount { get; set; }

        /// <summary>Aging of the open documents and installments on this side.</summary>
        public AgingDto Aging { get; set; } = new();
    }

    public class DashboardTaxDto
    {
        public decimal OutputTax { get; set; }
        public decimal InputTax { get; set; }

        /// <summary>OutputTax - InputTax.</summary>
        public decimal NetTaxPayable { get; set; }
    }

    /// <summary>Open invoices past their due date (an installment sale is counted through its installments instead).</summary>
    public class DashboardOverdueDto
    {
        public int Count { get; set; }
        public decimal Amount { get; set; }
    }

    public class DashboardInstallmentsDto
    {
        /// <summary>Live installment plans (not cancelled), settled ones included.</summary>
        public int ActivePlanCount { get; set; }

        /// <summary>Unpaid installments of live plans, all due dates.</summary>
        public int OutstandingCount { get; set; }
        public decimal OutstandingAmount { get; set; }

        /// <summary>Unpaid with a due date before today.</summary>
        public int OverdueCount { get; set; }
        public decimal OverdueAmount { get; set; }

        /// <summary>Unpaid and due from today to 30 days ahead.</summary>
        public int DueNext30DaysCount { get; set; }
        public decimal DueNext30DaysAmount { get; set; }
    }

    /// <summary>Money effects of open returns that were decided but not paid yet (PENDING), from our side.</summary>
    public class DashboardPendingReturnMoneyDto
    {
        /// <summary>Customers are to pay us (sale-return MONEY_IN).</summary>
        public decimal SaleReturnMoneyIn { get; set; }

        /// <summary>We are to refund customers (sale-return MONEY_OUT).</summary>
        public decimal SaleReturnMoneyOut { get; set; }

        /// <summary>Suppliers are to refund us (purchase-return MONEY_IN).</summary>
        public decimal PurchaseReturnMoneyIn { get; set; }

        /// <summary>We are to pay suppliers (purchase-return MONEY_OUT).</summary>
        public decimal PurchaseReturnMoneyOut { get; set; }
        public int EffectCount { get; set; }
    }

    /// <summary>One bucket of the dashboard charts (Persian calendar, PeriodType of the request).</summary>
    public class DashboardPeriodDto
    {
        public DateTime PeriodStart { get; set; }

        /// <summary>Start of the next period (exclusive).</summary>
        public DateTime PeriodEnd { get; set; }
        public int SaleCount { get; set; }

        /// <summary>Issued sale invoices' TotalAmount (tax included).</summary>
        public decimal SalesTotal { get; set; }
        public int PurchaseCount { get; set; }
        public decimal PurchasesTotal { get; set; }
        public decimal CashIn { get; set; }
        public decimal CashOut { get; set; }
        public decimal OutputTax { get; set; }
        public decimal InputTax { get; set; }
    }
}
