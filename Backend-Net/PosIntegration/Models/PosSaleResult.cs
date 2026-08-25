namespace PosIntegration.Models
{
    public class PosSaleResult
    {
        public bool IsSuccess { get; set; }
        public string ResponseCode { get; set; } = "";
        public string ResponseMessage { get; set; } = "";
        public string? Rrn { get; set; }
        public string? ApprovalCode { get; set; }
        public string? MaskedCardNumber { get; set; }
        public string? TerminalId { get; set; }
        public string? TransactionDate { get; set; }

        // Each vendor's raw JSON/payload, kept for diagnostics/logging - the wire formats differ
        // too much (plain JSON vs BTLV-in-JSON vs SignalR event args) to normalize losslessly.
        public string? RawResponse { get; set; }
    }
}
