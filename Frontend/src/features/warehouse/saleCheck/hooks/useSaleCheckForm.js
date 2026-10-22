import { useMemo, useState } from "react";

import { useDocumentProducts } from "@/features/warehouse/products/services/queries";
import { withProductInfo } from "../../shared/productInfo";
import { checkSummary, lineNeed } from "../domain/saleCheck";

/**
 * وضعیتِ فرمِ بررسیِ انبارِ یک پیش‌فاکتور: تعدادِ تأییدیِ هر ردیف (فقط تغییرکرده‌ها)، دانه‌های اسکن‌شده،
 * گزارش‌های معیوب/مفقود و دلیلِ تغییر — با همان قاعده‌های `domain/saleCheck.js`.
 *
 * @param canEdit کاربر می‌تواند تعداد را تغییر دهد (`SaleUpdate`)
 */
export function useSaleCheckForm(sale, { canEdit }) {
  const [quantities, setQuantities] = useState({}); // { [saleItemId]: number }
  const [scans, setScans] = useState({}); // { [saleItemId]: string[] }
  const [issues, setIssues] = useState([]);
  const [reason, setReason] = useState("");

  const { productMap } = useDocumentProducts((sale.items || []).map((item) => item.productId));
  const items = useMemo(() => withProductInfo(sale.items || [], productMap), [sale.items, productMap]);
  const { changed, blockingReason } = checkSummary(items, { scans, quantities, issues, reason, canEdit });
  const scannedCount = Object.values(scans).reduce((sum, codes) => sum + codes.length, 0);
  const needTotal = items.reduce((sum, item) => sum + lineNeed(item, quantities), 0);
  // بارکدهایی که اسکن یا گزارش شده‌اند (برای انتخابِ دانه‌ی مفقود).
  const usedBarcodes = new Set([...Object.values(scans).flat(), ...issues.map((issue) => issue.productUnitBarcode)]);
  const dirty = scannedCount > 0 || issues.length > 0 || changed.length > 0 || reason.trim() !== "";

  const setQuantity = (item, quantity) => {
    const next = { ...quantities };
    if (quantity === Number(item.quantity)) delete next[item.id];
    else next[item.id] = quantity;
    setQuantities(next);
    // اسکن‌های بیش از نیازِ تازه کنار می‌روند.
    const need = lineNeed(item, next);
    setScans((codes) => ({ ...codes, [item.id]: (codes[item.id] || []).slice(0, need) }));
  };

  const setLineScans = (itemId, codes) => setScans((current) => ({ ...current, [itemId]: codes }));

  const addIssue = (issue) => {
    setIssues((list) => [...list, issue]);
    // دانه‌ی معیوب نمی‌تواند هم‌زمان در ردیف‌ها باشد (سرور ۴۰۰ می‌دهد).
    setScans((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, codes]) => [id, codes.filter((code) => code !== issue.productUnitBarcode)]),
      ),
    );
  };

  const removeIssue = (barcode) => setIssues((list) => list.filter((issue) => issue.productUnitBarcode !== barcode));

  return {
    items,
    quantities,
    scans,
    issues,
    reason,
    setReason,
    setQuantity,
    setLineScans,
    addIssue,
    removeIssue,
    changed,
    blockingReason,
    scannedCount,
    needTotal,
    usedBarcodes,
    dirty,
  };
}
