using Domain.Enums;

namespace Application.Features.PosTerminal.Dtos
{
    public class PosTerminalDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public PosVendorEnum Vendor { get; set; }
        public string Host { get; set; }
        public int Port { get; set; }
        public string? ComPort { get; set; }
        public string? TerminalId { get; set; }
        public string? MerchantId { get; set; }
    }
}
