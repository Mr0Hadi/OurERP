namespace Application.Common.Dtos.Pos
{
    public class PosChargeResultDto
    {
        public bool IsSuccess { get; set; }
        public string ResponseCode { get; set; } = "";
        public string ResponseMessage { get; set; } = "";
        public string? Rrn { get; set; }
        public string? ApprovalCode { get; set; }
        public string? MaskedCardNumber { get; set; }
        public string? TerminalId { get; set; }
        public string? TransactionDate { get; set; }
    }
}
