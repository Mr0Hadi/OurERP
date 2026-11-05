import { useState } from "react";

import { useCountStocktakeLinesMutation } from "../services/mutations";
import { chunk, pendingCounts } from "../domain/stocktake";

/** سقفِ ردیف‌های هر درخواستِ `CountStocktakeLines` (قاعده‌ی سرور). */
const BATCH = 500;

/**
 * عددهای دستیِ انبارگردانی تا زدنِ «ثبت» فقط در صفحه می‌مانند؛ با هر +/− درخواستی نمی‌رود. «ثبت» همه‌ی ردیف‌های
 * تغییرکرده را با `CountStocktakeLines` می‌فرستد — هر ۵۰۰ ردیف یک درخواست، هر درخواست همه یا هیچ. ردیف‌های دسته‌ی
 * ثبت‌شده از پیش‌نویس می‌افتند؛ با اولین خطا ثبت می‌ایستد و بقیه برای تلاشِ دوباره می‌مانند.
 */
export function useStocktakeCountDrafts(stocktake) {
  const count = useCountStocktakeLinesMutation();
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const changes = pendingCounts(stocktake.lines ?? [], drafts);

  const setCount = (productId, quantity) => setDrafts((current) => ({ ...current, [productId]: quantity }));

  /** عددِ نمایشی: پیش‌نویس، وگرنه عددِ سرور. */
  const valueOf = (line) => (line.productId in drafts ? drafts[line.productId] : (line.manualCount ?? null));

  const save = async () => {
    setSaving(true);
    try {
      for (const batch of chunk(changes, BATCH)) {
        await count.mutateAsync({ stocktakeId: stocktake.id, lines: batch });
        setDrafts((current) => {
          const next = { ...current };
          for (const { productId } of batch) delete next[productId];
          return next;
        });
      }
    } catch {
      // پیامِ خطا را خودِ mutation نشان داده است.
    } finally {
      setSaving(false);
    }
  };

  return {
    valueOf,
    setCount,
    changedIds: new Set(changes.map((change) => change.productId)),
    pending: changes.length,
    saving,
    save,
    discard: () => setDrafts({}),
  };
}
