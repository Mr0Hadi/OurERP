import { usePurchaseReturnFormStore } from "../store/purchaseReturnFormStore";
import { CLAIM_KINDS } from "../domain/purchaseReturnRules";

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function usePurchaseReturnForm() {
  const {
    formData,
    setFormData,
    setItems,
    setSurplusItems,
    resetForm,
    initializedForId,
  } = usePurchaseReturnFormStore();

  const items = formData.items || [];
  const surplusItems = formData.surplusItems || [];

  const claimedQtyOf = (item) =>
    (item.claims || []).reduce((s, c) => s + (Number(c.qty) || 0), 0);

  /**
   * منطق تقسیم تعداد بین چند ادعا برای هر دو فهرست (کسری و مازاد)
   * یکسان است؛ فقط فهرست، تابع نوشتنش و دلیل پیش‌فرضِ ادعای تازه فرق
   * می‌کند. پس یک‌بار نوشته می‌شود و دوبار bind.
   */
  const makeClaimHandlers = (list, setList, defaultReasonOf) => ({
    // افزودن یک ردیف جدید دلیل برای این کالا؛ پیش‌فرض تعداد، باقیمانده‌ی
    // سهمیه‌ی قابل ادعا است تا کاربر فقط کم کند، نه از صفر بسازد.
    add: (lineId) => {
      setList(
        list.map((item) => {
          if (item.lineId !== lineId) return item;
          const allocated = claimedQtyOf(item);
          const remaining = Math.max(0, item.maxReturnableQty - allocated);
          if (remaining <= 0) return item;
          return {
            ...item,
            claims: [
              ...(item.claims || []),
              {
                id: generateId(),
                reason: defaultReasonOf(item),
                qty: remaining,
                note: "",
              },
            ],
          };
        }),
      );
    },

    update: (lineId, claimId, field, value) => {
      setList(
        list.map((item) => {
          if (item.lineId !== lineId) return item;
          const newClaims = (item.claims || []).map((claim) => {
            if (claim.id !== claimId) return claim;
            if (field === "qty") {
              const otherAllocated = (item.claims || [])
                .filter((c) => c.id !== claimId)
                .reduce((s, c) => s + (Number(c.qty) || 0), 0);
              const maxAllowed = Math.max(0, item.maxReturnableQty - otherAllocated);
              const num = Number(value);
              const clamped =
                Number.isNaN(num) || num < 0 ? 0 : Math.min(num, maxAllowed);
              return { ...claim, qty: clamped };
            }
            return { ...claim, [field]: value };
          });
          return { ...item, claims: newClaims };
        }),
      );
    },

    remove: (lineId, claimId) => {
      setList(
        list.map((item) =>
          item.lineId === lineId
            ? { ...item, claims: (item.claims || []).filter((c) => c.id !== claimId) }
            : item,
        ),
      );
    },
  });

  const shortageHandlers = makeClaimHandlers(items, setItems, () => "shortage");
  // دلیلِ پیش‌فرض یک ادعای مازاد، همان نوع مازادی است که انبار ثبت
  // کرده (اضافه یا ثبت‌نشده) — نه چیزی از واژگان کسری.
  const surplusHandlers = makeClaimHandlers(
    surplusItems,
    setSurplusItems,
    (item) => item.surplusKind,
  );

  const withClaimedQty = (list) =>
    list
      .map((item) => ({ ...item, claimedQty: claimedQtyOf(item) }))
      .filter((item) => item.claimedQty > 0 && (item.claims || []).length > 0);

  const selectedItems = withClaimedQty(items);
  const selectedSurplusItems = withClaimedQty(surplusItems);

  const computedTotal = [...selectedItems, ...selectedSurplusItems].reduce(
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
          claimKind: CLAIM_KINDS.SHORTAGE,
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

  /**
   * مازاد به تخصیص FIFO نیاز ندارد: هر کارت دقیقاً روی یک ردیف مازادِ
   * انبار نشسته، پس هر ادعا مستقیماً یک ردیف مرجوعی می‌شود.
   */
  const expandSurplusClaims = (item) =>
    (item.claims || [])
      .filter((claim) => (Number(claim.qty) || 0) > 0)
      .map((claim) => {
        const qty = Number(claim.qty) || 0;
        return {
          issueId: generateId(),
          sourceSurplusId: item.sourceSurplusId,
          claimKind: CLAIM_KINDS.SURPLUS,
          surplusKind: item.surplusKind,
          productId: item.productId ?? null,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          qty,
          unitPrice: item.unitPrice,
          lineTotal: qty * item.unitPrice,
          reason: claim.reason,
          note: claim.note || "",
        };
      });

  const buildPayload = () => ({
    purchaseId: formData.purchaseId,
    purchaseInvoiceNumber: formData.purchaseInvoiceNumber,
    supplierId: formData.supplierId,
    supplierName: formData.supplierName,
    returnDate: formData.returnDate,
    reason: formData.reason,
    description: formData.description || "",
    items: [
      ...selectedItems.flatMap((item) => distributeItemAcrossSourceIssues(item)),
      ...selectedSurplusItems.flatMap((item) => expandSurplusClaims(item)),
    ],
  });

  return {
    formData,
    setFormData,
    items,
    surplusItems,
    selectedItems,
    selectedSurplusItems,
    handleAddClaim: shortageHandlers.add,
    handleUpdateClaim: shortageHandlers.update,
    handleRemoveClaim: shortageHandlers.remove,
    handleAddSurplusClaim: surplusHandlers.add,
    handleUpdateSurplusClaim: surplusHandlers.update,
    handleRemoveSurplusClaim: surplusHandlers.remove,
    computedTotal,
    buildPayload,
    resetForm,
    initializedForId,
  };
}