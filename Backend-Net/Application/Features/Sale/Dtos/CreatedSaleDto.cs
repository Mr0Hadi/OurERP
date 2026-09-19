using Domain.Enums;

namespace Application.Features.Sale.Dtos
{
    public class CreatedSaleDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public SalesStatusEnum Status { get; set; }
    }
}
