// src/features/purchases/hooks/usePurchaseReturnForm.js
import { usePurchaseReturnFormStore } from "../store/purchaseReturnFormStore";

export function usePurchaseReturnForm() {
  const { formData, setFormData, setItems, resetForm, initializedForId } =
    usePurchaseReturnFormStore();

  const items = formData.items || [];

  // شناسه‌ی یکتای هر ردیف اکنون issueId است (نه productId)، چون یک
  // محصول می‌تواند چند ردیف مستقل (چند نوع مشکل) داشته باشد.
  const handleItemChange = (issueId, field, value) => {
    setItems(
      items.map((item) => {
        if (item.issueId !== issueId) return item;
        if (field === "qty") {
          const num = Number(value);
          const clamped =
            Number.isNaN(num) || num < 0
              ? 0
              : Math.min(num, item.maxReturnableQty);
          return { ...item, qty: clamped };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const selectedItems = items.filter((item) => item.qty > 0);
  const computedTotal = selectedItems.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );

  const buildPayload = () => ({
    purchaseId: formData.purchaseId,
    purchaseInvoiceNumber: formData.purchaseInvoiceNumber,
    supplierId: formData.supplierId,
    supplierName: formData.supplierName,
    returnDate: formData.returnDate,
    reason: formData.reason,
    description: formData.description || "",
    items: selectedItems.map((item) => ({
      issueId: item.issueId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.qty * item.unitPrice,
      reason: item.reason || formData.reason,
      note: item.note || "",
    })),
  });

  return {
    formData,
    setFormData,
    items,
    selectedItems,
    handleItemChange,
    computedTotal,
    buildPayload,
    resetForm,
    initializedForId,
  };
}