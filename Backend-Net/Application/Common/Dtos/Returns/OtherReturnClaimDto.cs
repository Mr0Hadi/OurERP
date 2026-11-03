using Domain.Enums;

namespace Application.Common.Dtos.Returns
{
    /// <summary>
    /// A claim another return already made on this document line / product (frontend-requests 14.1), so the return form can say
    /// "3 already claimed in RET-12" without reading every return. Rejected and cancelled returns are left out; settled ones stay.
    /// OffScopeKind = EXCESS is the line's excess, not its own ordered quantity. The return being edited is listed too - the
    /// client leaves it out itself.
    /// </summary>
    public class OtherReturnClaimDto
    {
        public int ReturnId { get; set; }
        public string ReturnNumber { get; set; } = string.Empty;
        public ReturnStatusEnum Status { get; set; }
        public ReturnOffScopeKindEnum? OffScopeKind { get; set; }
        public int Quantity { get; set; }
    }
}
