using Domain.Enums;

namespace Application.Features.Sale.Dtos
{
    public class SaleProformaEventDto
    {
        public int Id { get; set; }
        public SaleProformaEventEnum Kind { get; set; }
        public string? KindTitle { get; set; }
        public SaleProformaStageEnum FromStage { get; set; }
        public SaleProformaStageEnum ToStage { get; set; }
        public int Revision { get; set; }
        public int? UserId { get; set; }
        public string? UserName { get; set; }
        public string? Note { get; set; }
        public DateTime OccurredAt { get; set; }
    }
}
