namespace Application.Features.SaleReturn.Dtos
{
    // Backs the warehouse outbound-shipping queue: every AWAITING replacement decision waiting
    // to be shipped to a customer.
    public class ReplacementShippingQueueItemDto
    {
        public int SaleReturnDecisionId { get; set; }
        public int SaleReturnId { get; set; }
        public string ReturnNumber { get; set; }
        public int SaleId { get; set; }
        public string SaleInvoiceNumber { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }
        public int Quantity { get; set; }
        public int ShippedQuantity { get; set; }
        public int RemainingQuantity { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
