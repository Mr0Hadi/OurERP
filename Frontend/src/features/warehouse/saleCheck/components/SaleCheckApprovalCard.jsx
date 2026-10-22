import Notice from "@/shared/components/feedback/Notice";
import FormField from "@/shared/components/forms/FormField";
import SectionCard from "@/shared/components/forms/SectionCard";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatNumber } from "@/shared/lib/numberFormat";
import { changeDraft } from "../domain/saleCheck";

/**
 * خلاصه‌ی بررسی (چند دانه از چند دانه اسکن شده) و، اگر ردیفی تغییر کرده، دلیلِ تغییر — که در تاریخچه‌ی
 * پیش‌فاکتور برای فروش می‌ماند. «شروع با فهرستِ تغییرها» متنِ «نام: ۲ ← ۱» را آماده می‌گذارد.
 *
 * @param form خروجیِ `useSaleCheckForm`
 */
export default function SaleCheckApprovalCard({ form }) {
  const { changed, quantities, reason, setReason, scannedCount, needTotal } = form;
  const draft = changeDraft(changed, quantities);

  return (
    <SectionCard title="تأیید انبار">
      <p className="text-sm">
        <span className="font-semibold tabular-nums">{formatNumber(scannedCount)}</span>
        <span className="text-muted-foreground"> از </span>
        <span className="font-semibold tabular-nums">{formatNumber(needTotal)}</span>
        <span className="text-muted-foreground"> دانه اسکن شده</span>
      </p>
      {changed.length > 0 && (
        <>
          <Notice tone="caution">
            {formatNumber(changed.length)} ردیف تغییر کرده. پیش‌فاکتورِ تغییرکرده به مشتری داده می‌شود؛ دلیل را بنویسید.
          </Notice>
          <FormField label="دلیلِ تغییر" htmlFor="check-reason" required hint="در تاریخچه‌ی پیش‌فاکتور برای فروش می‌ماند.">
            <Textarea
              id="check-reason"
              rows={3}
              value={reason}
              placeholder={draft}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
          {!reason.trim() && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setReason(`${draft} — `)}
            >
              شروع با فهرستِ تغییرها
            </Button>
          )}
        </>
      )}
    </SectionCard>
  );
}
