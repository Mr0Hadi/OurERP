using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    public class SaleReturn
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public int SaleId { get; set; }
        public DateTime RequestDate { get; set; }
        public SaleReturnStatusEnum Status { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public Sale? Sale { get; set; }
        public List<SaleReturnClaim> Claims { get; set; } = new();

        // Roll-ups over the loaded graph. In-memory only (never translatable to SQL) - use them on
        // a materialised entity, not inside an EF projection. They only mean anything when the
        // whole Claims -> InspectionItems -> Decisions spine has been Included; see
        // Application.Features.SaleReturn.SaleReturnQueryExtensions.WithReturnGraph().
        [NotMapped]
        public int ClaimedQuantity => Claims.Sum(c => c.ClaimedQuantity);

        [NotMapped]
        public int InspectedQuantity => Claims.Sum(c => c.InspectedQuantity);

        [NotMapped]
        public int DecidedQuantity => Claims.Sum(c => c.DecidedQuantity);
    }
}
