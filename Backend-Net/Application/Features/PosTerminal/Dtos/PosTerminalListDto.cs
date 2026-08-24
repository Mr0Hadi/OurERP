using Domain.Enums;

namespace Application.Features.PosTerminal.Dtos
{
    public class PosTerminalListDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public PosVendorEnum Vendor { get; set; }
        public string Host { get; set; }
        public int Port { get; set; }
    }
}
