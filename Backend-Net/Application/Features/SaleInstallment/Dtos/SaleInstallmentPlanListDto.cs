using Domain.Enums;

namespace Application.Features.SaleInstallment.Dtos
{
    public class SaleInstallmentPlanListDto
    {
        public int PlanId { get; set; }
        public int SaleId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public UInt64 RemainingAmount { get; set; }
        public int InstallmentCount { get; set; }
        public int PaidInstallmentCount { get; set; }
        public DateTime? NextDueDate { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public SaleInstallmentPlanStatusEnum Status { get; set; }
        public string StatusTitle { get; set; } = string.Empty;
    }
}
