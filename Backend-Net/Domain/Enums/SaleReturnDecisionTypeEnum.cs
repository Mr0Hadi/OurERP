namespace Domain.Enums
{
    public enum SaleReturnDecisionTypeEnum
    {
        REFUND,           // cash back to the customer
        REPLACEMENT,      // ship a replacement unit to the customer
        STORE_CREDIT,     // credit toward the customer's next purchase
        NO_COMPENSATION,  // claim rejected for this quantity, no compensation
    }
}
