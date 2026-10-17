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

        /// <summary>Display only - which bank's name and logo the frontend shows (e.g. keshavarzi, refah).</summary>
        public string? BankCode { get; set; }

        /// <summary>The bank account this device settles into: a card payment taken on it lands there unless the row names another.</summary>
        public int? BankAccountId { get; set; }
        public BankAccount? BankAccount { get; set; }
    }
}
