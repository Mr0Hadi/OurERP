using Application.Common.Enums;
using Common.Extensions;
using Domain.Enums;

namespace Application.Common.Returns
{
    /// <summary>
    /// The return lifecycle state machine, shared verbatim by PurchaseReturn and SaleReturn (their
    /// calculation services only supply the two graph facts). Pure: no entities, no DB.
    ///
    /// <code>
    ///                 Cancel   Reject   Delete   Reopen
    /// OPEN            yes*     yes*     yes*     no
    /// IN_PROGRESS     yes*     yes*     yes*     no
    /// SETTLED         no       no       no       no
    /// REJECTED        no (→ Reopen)              yes
    /// CANCELLED       no       no       no       no
    /// </code>
    /// * refused while goods have physically moved through a goods round (no way back), or while a
    /// money effect is recorded (way back: remove that resolution, then retry).
    ///
    /// Why money locks: a money effect is born APPLIED because it records a payment that already
    /// happened, and it also writes a revenue row to the inventory cost ledger.
    /// Cancelling around it would leave a recorded payment hanging off a dead return. Removing the
    /// resolution is the path that reverses it properly, so the message sends the user there.
    /// </summary>
    public static class ReturnLifecycleRules
    {
        public static string? GetBlocker(ReturnStatusEnum status, bool hasMovedGoods, bool hasRecordedMoney, ReturnLifecycleActionEnum action)
        {
            var statusLabel = status.GetDescription();

            if (status == ReturnStatusEnum.CANCELLED)
                return "این مرجوعی قبلاً لغو شده است و هیچ عملیاتی روی آن مجاز نیست.";

            if (action == ReturnLifecycleActionEnum.REOPEN)
            {
                return status == ReturnStatusEnum.REJECTED
                    ? null
                    : $"فقط مرجوعی‌های رد شده قابل بازگشایی هستند؛ این مرجوعی در وضعیت «{statusLabel}» است.";
            }

            if (status == ReturnStatusEnum.REJECTED)
            {
                return action == ReturnLifecycleActionEnum.REJECT
                    ? "این مرجوعی قبلاً رد شده است؛ برای ادامه‌ی رسیدگی ابتدا آن را بازگشایی کنید."
                    : $"این مرجوعی در وضعیت «{statusLabel}» است و قابل {Verb(action)} نیست؛ ابتدا آن را بازگشایی کنید.";
            }

            if (status == ReturnStatusEnum.SETTLED)
                return $"این مرجوعی در وضعیت «{statusLabel}» است و دیگر قابل {Verb(action)} نیست.";

            // OPEN / IN_PROGRESS. Goods first: once stock has moved there is nothing the user can
            // undo, so pointing them at the money resolution would send them down a dead end.
            if (hasMovedGoods)
                return $"بخشی از کالای این مرجوعی جابه‌جا شده است و مرجوعی دیگر قابل {Verb(action)} نیست.";

            if (hasRecordedMoney)
                return $"این مرجوعی اثر مالی اجراشده دارد و قابل {Verb(action)} نیست؛ ابتدا تصمیم‌های مالی آن را از بخش تصمیم‌ها حذف کنید.";

            return null;
        }

        /// <summary>The refusal Add/Remove resolution and ExecuteGoodsRound give on a return they may not edit.</summary>
        public static string NotEditableMessage(ReturnStatusEnum status) =>
            $"این مرجوعی در وضعیت «{status.GetDescription()}» است و قابل ویرایش نیست.";

        private static string Verb(ReturnLifecycleActionEnum action) => action switch
        {
            ReturnLifecycleActionEnum.CANCEL => "لغو",
            ReturnLifecycleActionEnum.REJECT => "رد",
            ReturnLifecycleActionEnum.DELETE => "حذف",
            _ => "بازگشایی",
        };
    }
}
