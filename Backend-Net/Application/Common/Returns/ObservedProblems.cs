using Domain.Enums;

namespace Application.Common.Returns
{
    /// <summary>
    /// Problems a warehouse can actually see on goods in front of it - the only ones a receiving defect or a goods-round
    /// observation may carry. Mirrors the frontend's OBSERVED_PROBLEMS exactly.
    ///
    /// Every observation is part of the quantity that ARRIVED: the server turns it into a received, quarantined unit.
    /// SHORT_SHIPPED there therefore minted units that never came (and the purchase counted them received and paid for).
    /// A shortage is recorded by entering a smaller arrived quantity; the rest stays owed on the line. The other excluded
    /// members (wrong quantity invoiced/ordered, changed mind, unlisted, over-shipped) describe paperwork or intent, not
    /// the state of a unit, and belong on a return claim instead.
    /// </summary>
    public static class ObservedProblems
    {
        public const string NotObservableMessage =
            "این مشکل با دیدن کالا قابل ثبت نیست. کسری را با واردکردن مقدار رسیده‌ی کمتر ثبت کنید؛ مشکل‌های فاکتور یا سفارش در ادعای مرجوعی ثبت می‌شوند.";

        public static bool IsObservable(ReturnProblemEnum problem) =>
            problem is ReturnProblemEnum.DEFECTIVE
                or ReturnProblemEnum.DAMAGED_IN_TRANSIT
                or ReturnProblemEnum.WRONG_ITEM_SHIPPED
                or ReturnProblemEnum.EXPIRED
                or ReturnProblemEnum.QUALITY_ISSUE
                or ReturnProblemEnum.OTHER;
    }
}
