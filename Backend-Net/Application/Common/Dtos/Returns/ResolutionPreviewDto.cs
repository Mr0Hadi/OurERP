using Domain.Enums;

namespace Application.Common.Dtos.Returns
{
    /// <summary>
    /// PreviewResolution's answer (frontend-requests 13.4): what AddClaimResolution would do with the same body, nothing saved.
    /// </summary>
    public class ResolutionPreviewDto
    {
        /// <summary>True when AddClaimResolution would accept the body as it stands now.</summary>
        public bool IsValid { get; set; }

        /// <summary>Why not. Field is the request path ("goods[0].quantity"), or null for a rule about the whole decision.</summary>
        public List<ResolutionPreviewErrorDto> Errors { get; set; } = new();

        /// <summary>The effects the composition expands to, as they would be stored (empty when the body is invalid).</summary>
        public List<ResolutionPreviewEffectDto> Effects { get; set; } = new();

        /// <summary>
        /// A suggestion only: the decision's quantity at the claim's unit price. Staff record whatever amount they agree; nothing
        /// balances money against goods.
        /// </summary>
        public UInt64 SuggestedMoneyAmount { get; set; }
    }

    public class ResolutionPreviewErrorDto
    {
        public string? Field { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class ResolutionPreviewEffectDto
    {
        public ReturnEffectDirectionEnum Direction { get; set; }
        public int Quantity { get; set; }
        /// <summary>Goods effects: IN_STOCK (shelf) or QUARANTINED; null when the warehouse states it at execution.</summary>
        public ProductUnitStatusEnum? Source { get; set; }
        public int? ProductId { get; set; }
        public UInt64? UnitPrice { get; set; }
        /// <summary>Money effects only.</summary>
        public UInt64? Amount { get; set; }
        public ReturnPaymentMethodEnum? Method { get; set; }
        /// <summary>APPLIED when it happens with the decision (money with PaidAt), PENDING when it waits for a later step.</summary>
        public ReturnEffectStatusEnum Status { get; set; }
    }
}
