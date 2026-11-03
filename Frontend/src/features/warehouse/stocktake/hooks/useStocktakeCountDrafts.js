import { useState } from "react";

import { useCountStocktakeLineMutation } from "../services/mutations";
import { pendingCounts } from "../domain/stocktake";

/**
 * عددهای دستیِ انبارگردانی تا زدنِ «ثبت» فقط در صفحه می‌مانند؛ با هر +/− درخواستی نمی‌رود. «ثبت» هر ردیفِ
 * تغییرکرده را یکی‌یکی می‌فرستد (`CountStocktakeLine` یک ردیف می‌گیرد — TODO(بکند): §36، ثبتِ چند ردیف در یک
 * درخواست). ردیفِ ثبت‌شده از پیش‌نویس می‌افتد؛ با اولین خطا ثبت می‌ایستد و بقیه برای تلاشِ دوباره می‌مانند.
 */
export function useStocktakeCountDrafts(stocktake) {
  const count = useCountStocktakeLineMutation();
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const changes = pendingCounts(stocktake.lines ?? [], drafts);

  const setCount = (productId, quantity) => setDrafts((current) => ({ ...current, [productId]: quantity }));

  /** عددِ نمایشی: پیش‌نویس، وگرنه عددِ سرور. */
  const valueOf = (line) => (line.productId in drafts ? drafts[line.productId] : (line.manualCount ?? null));

  const save = async () => {
    setSaving(true);
    try {
      for (const { productId, quantity } of changes) {
        await count.mutateAsync({ stocktakeId: stocktake.id, productId, quantity });
        setDrafts((current) => {
          const next = { ...current };
          delete next[productId];
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
