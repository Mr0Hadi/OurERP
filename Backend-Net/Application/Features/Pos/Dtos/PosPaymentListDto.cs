using Domain.Enums;

namespace Application.Features.Pos.Dtos
{
    public class PosPaymentListDto
    {
        public int Id { get; set; }
        public DateTime PaidAt { get; set; }
        public DateTime? RecordedAt { get; set; }
        public decimal Amount { get; set; }
        public PaymentDirectionEnum Direction { get; set; }

        /// <summary>Set when the payment was voided (refunded); the row stays in the list.</summary>
        public DateTime? VoidedAt { get; set; }
        public PaymentSourceEnum? Source { get; set; }

        public int PosTerminalId { get; set; }
        public string PosTerminalName { get; set; } = string.Empty;
        public string? TransferRef { get; set; }
        public string? MaskedCardNumber { get; set; }
        public string? ApprovalCode { get; set; }
        public string? TraceNumber { get; set; }

        public int? SaleId { get; set; }
        public int? PurchaseId { get; set; }
        public string? InvoiceNumber { get; set; }

        /// <summary>The customer (sale) or supplier (purchase).</summary>
        public string? PartyName { get; set; }

        public int? RecordedByUserId { get; set; }
        public string? RecordedByName { get; set; }
    }
}
