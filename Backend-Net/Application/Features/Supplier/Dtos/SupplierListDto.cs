using Domain.Enums;

namespace Application.Features.Supplier.Dtos
{
    public class SupplierListDto
    {
        public int Id { get; set; }
        public string CompanyName { get; set; }
        public string FullName { get; set; }
        public BalanceTypeEnum? BalanceType { get; set; }
        public string? Status { get; set; }
    }
}
