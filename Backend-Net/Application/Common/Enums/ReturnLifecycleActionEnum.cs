namespace Application.Common.Enums
{
    /// <summary>
    /// The explicit lifecycle commands on a PurchaseReturn/SaleReturn. Used as the key of
    /// I*ReturnCalculationService.GetLifecycleBlocker so the command handlers and the detail DTO's
    /// CanCancel/CanReject/CanDelete/CanReopen flags read the same rule.
    /// </summary>
    public enum ReturnLifecycleActionEnum
    {
        CANCEL,
        REJECT,
        DELETE,
        REOPEN,
    }
}
