namespace Domain.Entities
{
    /// <summary>
    /// One execution round of a goods effect (ExecuteGoodsRoundCommand) - a physical
    /// receiving/dispatch log entry. Multi-round-safe: a goods effect's Quantity can be fulfilled
    /// across several of these.
    /// </summary>
    public class SaleReturnEffectRound
    {
        public int Id { get; set; }
        public int SaleReturnEffectId { get; set; }
        public DateTime Date { get; set; }
        public int Quantity { get; set; }

        /// <summary>GOODS_IN only: Quantity minus the sum of this round's Observations.</summary>
        public int? HealthyQuantity { get; set; }

        public string? PartyName { get; set; }
        public string? PartyNationalId { get; set; }
        public string? VehiclePlate { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }

        public SaleReturnEffect? SaleReturnEffect { get; set; }
        public List<SaleReturnEffectObservation> Observations { get; set; } = new();
    }
}
