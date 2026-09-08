using Domain.Enums;

namespace Application.Features.SaleReturn.Dtos
{
    public class SaleReturnEffectDto
    {
        public int Id { get; set; }
        public ReturnEffectDirectionEnum Direction { get; set; }
        public int Quantity { get; set; }
        public int DoneQuantity { get; set; }
        public int RemainingQuantity { get; set; }
        public int? RestockedQuantity { get; set; }
        public int? ProductId { get; set; }

        /// <summary>Name of <see cref="ProductId"/>. Without it a replacement effect carrying a
        /// different product than its claim renders as a bare id.</summary>
        public string? ProductName { get; set; }
        public UInt64? Amount { get; set; }
        public ReturnPaymentMethodEnum? Method { get; set; }
        public string? Reference { get; set; }
        public string? Note { get; set; }
        public ReturnEffectStatusEnum Status { get; set; }
        public DateTime? AppliedAt { get; set; }
        public List<SaleReturnEffectMoneyPartDto> MoneyParts { get; set; } = new();
        public List<SaleReturnEffectRoundDto> History { get; set; } = new();
    }

    public class SaleReturnEffectMoneyPartDto
    {
        public int Id { get; set; }
        public ReturnPaymentMethodEnum Method { get; set; }
        public UInt64 Amount { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
    }

    public class SaleReturnEffectRoundDto
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public int Quantity { get; set; }
        public int? HealthyQuantity { get; set; }
        public string? PartyName { get; set; }
        public string? PartyNationalId { get; set; }
        public string? VehiclePlate { get; set; }
        public string? Note { get; set; }
        public List<SaleReturnEffectObservationDto> Observations { get; set; } = new();
    }

    public class SaleReturnEffectObservationDto
    {
        public int Id { get; set; }
        public ReturnProblemEnum Problem { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
    }
}
