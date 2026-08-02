using Domain.Entities;
using Domain.Enums;

namespace Application.Features.PurchaseReceiving
{
    public static class PurchaseReceivingStatusUpdater
    {
        public static void UpdateStatuses(PurchaseReceipt receipt, Domain.Entities.Purchase purchase, List<ReceiptDiscrepancy> discrepancies)
        {
            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                return;

            var allDecided = discrepancies.Count > 0 && discrepancies.All(x => x.Status == DiscrepancyStatusEnum.DECIDED);
            var anyDecided = discrepancies.Any(x => x.Status == DiscrepancyStatusEnum.DECIDED);

            if (discrepancies.Count == 0)
            {
                receipt.Status = PurchaseReceiptStatusEnum.RECEIVING;
                purchase.Status = PurchaseStatusEnum.RECEIVING;
            }
            else if (allDecided)
            {
                receipt.Status = PurchaseReceiptStatusEnum.COMPLETED;
                purchase.Status = PurchaseStatusEnum.COMPLETED;
            }
            else if (anyDecided)
            {
                receipt.Status = PurchaseReceiptStatusEnum.DISCREPANCY_OPEN;
                purchase.Status = PurchaseStatusEnum.RETURN_IN_PROGRESS;
            }
            else
            {
                receipt.Status = PurchaseReceiptStatusEnum.DISCREPANCY_OPEN;
                purchase.Status = PurchaseStatusEnum.DISCREPANCY_REPORTED;
            }
        }
    }
}
