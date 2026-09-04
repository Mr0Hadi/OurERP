using Domain.Enums;

namespace Application.Features.Supplier.Dtos
{
    public class SupplierListDto
    {
        public int Id { get; set; }
        public string CompanyName { get; set; }
        public string LastName { get; set; }
        public string FirstName { get; set; }
        public BalanceTypeEnum? BalanceType { get; set; }
        public string? Status { get; set; }

        /// <summary>Stable bucket object key; null when the supplier has no image.</summary>
        public string? ImageKey { get; set; }

        /// <summary>Short-lived signed URL, filled in after the page is materialized.</summary>
        public string? ImageUrl { get; set; }
    }
}
