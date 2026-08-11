import { useSalesReturnFormStore } from "../store/salesReturnFormStore";

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function useSalesReturnForm() {
  const { formData, setFormData, setItems, resetForm, initializedForId } =
    useSalesReturnFormStore();

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
            { id: generateId(), reason: "defective", qty: remaining, note: "" },
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

  const buildPayload = () => ({
    saleId: formData.saleId,
    saleInvoiceNumber: formData.saleInvoiceNumber,
    customerId: formData.customerId,
    customerName: formData.customerName,
    returnDate: formData.returnDate,
    reason: formData.reason,
    description: formData.description || "",
    items: selectedItems.map((item) => ({
      lineId: item.lineId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      unitPrice: item.unitPrice,
      claimedQty: item.claimedQty,
      lineTotal: item.claimedQty * item.unitPrice,
      claims: (item.claims || [])
        .filter((c) => (Number(c.qty) || 0) > 0)
        .map((c) => ({ id: c.id, reason: c.reason, qty: Number(c.qty) || 0, note: c.note || "" })),
    })),
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