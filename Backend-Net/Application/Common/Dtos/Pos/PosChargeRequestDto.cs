namespace Application.Common.Dtos.Pos
{
    public class PosChargeRequestDto
    {
        public int PosTerminalId { get; set; }
        public ulong Amount { get; set; }
        public string InvoiceNumber { get; set; } = "";
        public string? AdditionalData { get; set; }
    }
}
