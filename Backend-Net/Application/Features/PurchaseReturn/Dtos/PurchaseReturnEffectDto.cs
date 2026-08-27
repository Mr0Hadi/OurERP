using Domain.Enums;

namespace Application.Features.PurchaseReturn.Dtos
{
    public class PurchaseReturnEffectDto
    {
        public int Id { get; set; }
        public int PurchaseReturnResolutionId { get; set; }
        public ReturnEffectKindEnum Kind { get; set; }
        public int Quantity { get; set; }
        public int DoneQuantity { get; set; }
        public int? RestockedQuantity { get; set; }
        public int? ProductId { get; set; }
        public UInt64? Amount { get; set; }
        public ReturnPaymentMethodEnum? Method { get; set; }
        public string? Reference { get; set; }
        public string? Note { get; set; }
        public ReturnEffectStatusEnum Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? AppliedAt { get; set; }
        public List<PurchaseReturnEffectMoneyPartDto> MoneyParts { get; set; } = new();
        public List<PurchaseReturnEffectRoundDto> History { get; set; } = new();
    }

    public class PurchaseReturnEffectMoneyPartDto
    {
        public int Id { get; set; }
        public ReturnPaymentMethodEnum Method { get; set; }
        public UInt64 Amount { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
    }

    public class PurchaseReturnEffectRoundDto
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public int Quantity { get; set; }
        public int? HealthyQuantity { get; set; }
        public string? PartyName { get; set; }
        public string? PartyNationalId { get; set; }
        public string? VehiclePlate { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<PurchaseReturnEffectObservationDto> Observations { get; set; } = new();
    }

    public class PurchaseReturnEffectObservationDto
    {
        public int Id { get; set; }
        public ReturnProblemEnum Problem { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
    }
}
