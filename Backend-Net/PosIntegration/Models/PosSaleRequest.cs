namespace PosIntegration.Models
{
    public class PosSaleRequest
    {
        public ulong Amount { get; set; }
        public string InvoiceNumber { get; set; } = "";
        public string CurrencyCode { get; set; } = "364";
        public string AdditionalData { get; set; } = "";

        // Connection info for the till's local bridge process, carried per-call so one client
        // instance can serve multiple terminals of the same vendor.
        public string Host { get; set; } = "";
        public int Port { get; set; }
        public string? ComPort { get; set; }
        public string? TerminalId { get; set; }
        public string? MerchantId { get; set; }
    }
}
