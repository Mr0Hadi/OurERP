using Application.Common.Dtos;
using Domain.Enums;

namespace Application.Features.PartyAccount.Dtos
{
    /// <summary>An on-account payment (علی‌الحساب): money received from a customer or paid to a supplier with no invoice.</summary>
    public class PartyPaymentDto
    {
        public int Id { get; set; }

        /// <summary>Exactly one is set.</summary>
        public int? CustomerId { get; set; }
        public int? SupplierId { get; set; }
        public string PartyName { get; set; } = string.Empty;

        public PaymentDirectionEnum Direction { get; set; }
        public PaymentTypeEnum Type { get; set; }
        public decimal Amount { get; set; }

        /// <summary>Sum of the active allocations, and what is left to allocate (0 once voided).</summary>
        public decimal AllocatedAmount { get; set; }
        public decimal UnallocatedAmount { get; set; }

        /// <summary>
        /// Whether this payment can be applied to invoices at all: a customer's payment IN or a supplier's payment OUT, not
        /// voided. A refund the other way stays on the account.
        /// </summary>
        public bool CanAllocate { get; set; }

        public DateTime PaidAt { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
        public int? BankAccountId { get; set; }
        public string? BankAccountTitle { get; set; }
        public int? PosTerminalId { get; set; }
        public string? Description { get; set; }

        public DateTime? VoidedAt { get; set; }
        public DateTime? RecordedAt { get; set; }
        public int? RecordedByUserId { get; set; }
        public string? RecordedByName { get; set; }

        /// <summary>Detail only (empty on the list): every allocation, active and voided, oldest first.</summary>
        public List<PaymentAllocationDto> Allocations { get; set; } = new();
    }

    /// <summary>An invoice of the party that still owes money - a candidate for an allocation.</summary>
    public class AllocatableDocumentDto
    {
        /// <summary>Exactly one is set.</summary>
        public int? SaleId { get; set; }
        public int? PurchaseId { get; set; }
        public string? InvoiceNumber { get; set; }
        public DateTime? InvoiceDate { get; set; }

        /// <summary>The due date (PaymentDate); oldest due first in the list.</summary>
        public DateTime? PaymentDate { get; set; }

        /// <summary>A sale still in PROFORMA (WAREHOUSE_CHECKED): allocating to it pays it and issues its invoice.</summary>
        public bool IsProforma { get; set; }

        public UInt64 PayableAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public UInt64 RemainingAmount { get; set; }
    }
}
