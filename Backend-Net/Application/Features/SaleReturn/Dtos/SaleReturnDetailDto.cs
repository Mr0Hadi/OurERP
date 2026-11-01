using Domain.Enums;

namespace Application.Features.SaleReturn.Dtos
{
    public class SaleReturnDetailDto
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public DateTime ReturnDate { get; set; }
        public int SaleId { get; set; }
        public string SaleInvoiceNumber { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string? Description { get; set; }
        public int? PreviousReturnId { get; set; }

        /// <summary>Return number of <see cref="PreviousReturnId"/>, so the client can name the
        /// related return without a second call. Null when this return starts a chain.</summary>
        public string? PreviousReturnNumber { get; set; }

        /// <summary>Why the return was rejected or cancelled (null otherwise, or when no reason was given).</summary>
        public string? StatusReason { get; set; }
        public ReturnStatusEnum Status { get; set; }
        public UInt64 TotalAmount { get; set; }
        public int Quantity { get; set; }
        public int DecidedQuantity { get; set; }
        public int RemainingQuantity { get; set; }
        public bool CanDelete { get; set; }
        public bool CanCancel { get; set; }
        public bool CanReject { get; set; }
        public bool CanReopen { get; set; }
        /// <summary>
        /// Why Cancel is refused now (ReturnLifecycleRules.GetBlocker), null when it is allowed - show it when no lifecycle
        /// button is offered (frontend-requests 14.3).
        /// </summary>
        public string? LifecycleBlocker { get; set; }
        /// <summary>Remaining quantity of pending goods effects by direction (frontend-requests 14.5).</summary>
        public Application.Common.Dtos.Returns.PendingWarehouseWorkDto PendingWarehouseWork { get; set; } = new();
        /// <summary>GetSaleReturnCreditNotePdf/Document would answer (a MONEY_OUT effect exists; frontend-requests 14.3).</summary>
        public bool CanPrintCreditNote { get; set; }
        public List<SaleReturnClaimDto> Claims { get; set; } = new();

        /// <summary>
        /// Units this return brought back as defective that are still in quarantine (custody CUSTOMER_RETURN, and this return is what
        /// last put them there). They leave through a purchase return to the supplier, a release or a scrap.
        /// </summary>
        public int QuarantinedQuantity { get; set; }

        /// <summary>Supplier/customer receipts, photos of the goods - replaced wholesale by Update*ReturnAttachments.</summary>
        public List<Application.Common.Dtos.DocumentAttachmentDto> Attachments { get; set; } = new();
    }
}
