using Domain.Enums;

namespace Domain.Entities
{
    public class PosTerminal
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool IsActive { get; set; }
        public PosVendorEnum Vendor { get; set; }
        public string Host { get; set; }
        public int Port { get; set; }
        public string? ComPort { get; set; }
        public string? TerminalId { get; set; }
        public string? MerchantId { get; set; }
    }
}
