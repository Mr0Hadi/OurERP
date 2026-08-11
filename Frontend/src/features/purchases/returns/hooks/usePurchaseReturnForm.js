import { usePurchaseReturnFormStore } from "../store/purchaseReturnFormStore";

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function usePurchaseReturnForm() {
  const { formData, setFormData, setItems, resetForm, initializedForId } =
    usePurchaseReturnFormStore();

  const items = formData.items || [];

  const claimedQtyOf = (item) =>
    (item.claims || []).reduce((s, c) => s + (Number(c.qty) || 0), 0);

  // افزودن یک ردیف جدید دلیل برای این کالا؛ پیش‌فرض تعداد، باقیمانده‌ی
  // سهمیه‌ی قابل مرجوع‌شدن است تا کاربر فقط کم کند، نه از صفر بسازد.
  const handleAddClaim = (lineId) => {
    setItems(
      items.map((item) => {
        if (item.lineId !== lineId) return item;
        const allocated = claimedQtyOf(item);
        const remaining = Math.max(0, item.maxReturnableQty - allocated);
        if (remaining <= 0) return item;
        return {
          ...item,
          claims: [
            ...(item.claims || []),
            { id: generateId(), reason: "shortage", qty: remaining, note: "" },
          ],
        };
      }),
    );
  };

  const handleUpdateClaim = (lineId, claimId, field, value) => {
    setItems(
      items.map((item) => {
        if (item.lineId !== lineId) return item;
        const newClaims = (item.claims || []).map((claim) => {
          if (claim.id !== claimId) return claim;
          if (field === "qty") {
            const otherAllocated = (item.claims || [])
              .filter((c) => c.id !== claimId)
              .reduce((s, c) => s + (Number(c.qty) || 0), 0);
            const maxAllowed = Math.max(0, item.maxReturnableQty - otherAllocated);
            const num = Number(value);
            const clamped = Number.isNaN(num) || num < 0 ? 0 : Math.min(num, maxAllowed);
            return { ...claim, qty: clamped };
          }
          return { ...claim, [field]: value };
        });
        return { ...item, claims: newClaims };
      }),
    );
  };

  const handleRemoveClaim = (lineId, claimId) => {
    setItems(
      items.map((item) =>
        item.lineId === lineId
          ? { ...item, claims: (item.claims || []).filter((c) => c.id !== claimId) }
          : item,
      ),
    );
  };

  const selectedItems = items
    .map((item) => ({ ...item, claimedQty: claimedQtyOf(item) }))
    .filter((item) => item.claimedQty > 0 && (item.claims || []).length > 0);

  const computedTotal = selectedItems.reduce(
    (sum, item) => sum + item.claimedQty * item.unitPrice,
    0,
  );

  /**
   * هر ادعا (claim) ممکن است از چند «مشکل گزارش‌شده‌ی اصلی» انبار
   * (sourceIssue) تشکیل شده باشد یا یک sourceIssue بین چند ادعا با
   * دلایل مختلف تقسیم شده باشد. با یک تخصیص FIFO ساده، تعداد هر ادعا
   * را بین sourceIssueهای همان کالا سهم‌بندی می‌کنیم؛ هر بخش، یک ردیف
   * مستقل با issueId تازه (برای ویرایش/تصمیم‌گیری داخل همین مرجوعی)
   * و sourceIssueId (برای حفظ پیوند با مشکل اصلی انبار، جهت جلوگیری
   * از مرجوع‌کردن دوباره‌ی همان کسری) می‌شود.
   */
  const distributeItemAcrossSourceIssues = (item) => {
    const queue = (item.sourceIssues || []).map((s) => ({ ...s, remaining: s.qty }));
    const outputs = [];

    (item.claims || []).forEach((claim) => {
      let need = Number(claim.qty) || 0;
      if (need <= 0) return;

      for (const issue of queue) {
        if (need <= 0) break;
        if (issue.remaining <= 0) continue;
        const take = Math.min(issue.remaining, need);
        outputs.push({
          issueId: generateId(),
          sourceIssueId: issue.issueId,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          qty: take,
          unitPrice: item.unitPrice,
          lineTotal: take * item.unitPrice,
          reason: claim.reason,
          note: claim.note || "",
        });
        issue.remaining -= take;
        need -= take;
      }
    });

    return outputs;
  };

  const buildPayload = () => ({
    purchaseId: formData.purchaseId,
    purchaseInvoiceNumber: formData.purchaseInvoiceNumber,
    supplierId: formData.supplierId,
    supplierName: formData.supplierName,
    returnDate: formData.returnDate,
    reason: formData.reason,
    description: formData.description || "",
    items: selectedItems.flatMap((item) => distributeItemAcrossSourceIssues(item)),
  });

  return {
    formData,
    setFormData,
    items,
    selectedItems,
    handleAddClaim,
    handleUpdateClaim,
    handleRemoveClaim,
    computedTotal,
    buildPayload,
    resetForm,
    initializedForId,
  };
}