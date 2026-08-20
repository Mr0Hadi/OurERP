import { useEffect } from 'react';
import { useReceivingFormStore } from '../store/receivingFormStore';

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function useReceivingForm(purchaseData) {
  const store = useReceivingFormStore();
  const {
    formData,
    setFormData,
    setReceivingItems,
    setUnknownItems,
    initializeFromPurchase,
    initializedForId,
    resetForm,
  } = store;

  const purchaseVersion =
    purchaseData?.id != null ? `${purchaseData.id}:${purchaseData.updatedAt}` : null;

  useEffect(() => {
    if (purchaseVersion && initializedForId !== purchaseVersion) {
      initializeFromPurchase(purchaseData);
    }
  }, [purchaseVersion, purchaseData, initializeFromPurchase, initializedForId]);

  const shortageOf = (item) => Math.max(0, item.expectedQty - (item.receivedQty || 0));
  const allocatedOf = (item) =>
    (item.issues || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

  const handleItemChange = (productId, field, value) => {
    const newItems = formData.items.map((item) => {
      if (item.productId !== productId) return item;
      const updated = { ...item, [field]: value };

      if (field === 'receivedQty') {
        const newShortage = Math.max(0, updated.expectedQty - (value || 0));
        let remainingBudget = newShortage;
        const trimmedIssues = [];
        for (const issue of updated.issues || []) {
          if (remainingBudget <= 0) break;
          const qty = Math.min(Number(issue.qty) || 0, remainingBudget);
          if (qty > 0) {
            trimmedIssues.push({ ...issue, qty });
            remainingBudget -= qty;
          }
        }
        updated.issues = trimmedIssues;
      }

      return updated;
    });
    setReceivingItems(newItems);
  };

  // انباردار مجبور نیست کل کسری را به‌عنوان مشکل ثبت کند؛ فقط بخشی
  // که واقعاً مشکل دارد (نه صرفاً دیرکرد ارسال) را اضافه می‌کند —
  // بقیه به‌طور خودکار «در انتظار محموله بعدی» تلقی می‌شود.
  const handleAddIssue = (productId) => {
    const newItems = formData.items.map((item) => {
      if (item.productId !== productId) return item;
      const shortage = shortageOf(item);
      const allocated = allocatedOf(item);
      const remaining = Math.max(0, shortage - allocated);
      if (remaining <= 0) return item;
      return {
        ...item,
        issues: [
          ...(item.issues || []),
          { id: generateId(), issueType: 'shortage', qty: remaining, note: '' },
        ],
      };
    });
    setReceivingItems(newItems);
  };

  const handleUpdateIssue = (productId, issueRowId, field, value) => {
    const newItems = formData.items.map((item) => {
      if (item.productId !== productId) return item;
      const shortage = shortageOf(item);

      const newIssues = (item.issues || []).map((issue) => {
        if (issue.id !== issueRowId) return issue;
        if (field === 'qty') {
          const otherAllocated = (item.issues || [])
            .filter((i) => i.id !== issueRowId)
            .reduce((s, i) => s + (Number(i.qty) || 0), 0);
          const maxAllowed = Math.max(0, shortage - otherAllocated);
          const num = Number(value);
          const clamped = Number.isNaN(num) || num < 0 ? 0 : Math.min(num, maxAllowed);
          return { ...issue, qty: clamped };
        }
        return { ...issue, [field]: value };
      });

      return { ...item, issues: newIssues };
    });
    setReceivingItems(newItems);
  };

  const handleRemoveIssue = (productId, issueRowId) => {
    const newItems = formData.items.map((item) =>
      item.productId === productId
        ? { ...item, issues: (item.issues || []).filter((i) => i.id !== issueRowId) }
        : item,
    );
    setReceivingItems(newItems);
  };

  // ── مازادِ یک قلم شناخته‌شده ───────────────────────────────────────
  // برخلاف کسری، مازاد از روی تعدادها قابل استنتاج نیست (چون سقف
  // دریافتی همان سفارش است)؛ انباردار باید صریحاً اعلامش کند. سقفی
  // هم ندارد — تامین‌کننده هر تعدادی ممکن است اضافه فرستاده باشد.
  const handleExcessChange = (productId, field, value) => {
    const newItems = formData.items.map((item) => {
      if (item.productId !== productId) return item;
      if (field === 'excessQty') {
        const num = Number(value);
        const safe = Number.isNaN(num) || num < 0 ? 0 : Math.floor(num);
        // با صفرشدن تعداد، یادداشتِ بی‌صاحب هم پاک می‌شود تا چیزی که
        // ثبت نمی‌شود روی صفحه باقی نماند.
        return { ...item, excessQty: safe, excessNote: safe > 0 ? item.excessNote : '' };
      }
      return { ...item, [field]: value };
    });
    setReceivingItems(newItems);
  };

  // ── کالای ثبت‌نشده ────────────────────────────────────────────────
  const unknownItems = formData.unknownItems || [];

  const handleAddUnknownItem = () => {
    setUnknownItems([
      ...unknownItems,
      { id: generateId(), productName: '', qty: 1, unit: 'عدد', note: '' },
    ]);
  };

  const handleUpdateUnknownItem = (rowId, field, value) => {
    setUnknownItems(
      unknownItems.map((row) => {
        if (row.id !== rowId) return row;
        if (field === 'qty') {
          const num = Number(value);
          const safe = Number.isNaN(num) || num < 0 ? 0 : Math.floor(num);
          return { ...row, qty: safe };
        }
        return { ...row, [field]: value };
      }),
    );
  };

  const handleRemoveUnknownItem = (rowId) => {
    setUnknownItems(unknownItems.filter((row) => row.id !== rowId));
  };

  const isUnknownRowComplete = (row) =>
    !!row.productName?.trim() && (Number(row.qty) || 0) > 0;

  // ردیف‌های نیمه‌پرشده بی‌صدا حذف نمی‌شوند — انباردار باید ببیند که
  // چیزی که نوشته ثبت نخواهد شد.
  const incompleteUnknownCount = unknownItems.filter(
    (row) =>
      !isUnknownRowComplete(row) &&
      (!!row.productName?.trim() || (Number(row.qty) || 0) > 0 || !!row.note?.trim()),
  ).length;

  const isAllComplete = formData.items.every(
    (item) => item.receivedQty >= item.expectedQty
  );

  const isTransporterValid =
    !!formData.transporterName?.trim() &&
    (!!formData.transporterNationalId?.trim() || !!formData.vehiclePlate?.trim());

  const buildPayload = () => ({
    id: formData.purchaseId,
    receivedItems: formData.items.map((item) => ({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      expectedQty: item.expectedQty,
      receivedQty: item.receivedQty,
      issues: (item.issues || []).map((i) => ({
        type: i.issueType,
        qty: Number(i.qty) || 0,
        note: i.note || '',
      })),
      excessQty: Number(item.excessQty) || 0,
      excessNote: item.excessNote || '',
    })),
    unknownItems: unknownItems.filter(isUnknownRowComplete).map((row) => ({
      productName: row.productName.trim(),
      qty: Number(row.qty) || 0,
      unit: row.unit?.trim() || 'عدد',
      note: row.note || '',
    })),
    receivingNote: formData.receivingNote,
    receivedDate: formData.receivedDate,
    transporterName: formData.transporterName,
    transporterNationalId: formData.transporterNationalId,
    vehiclePlate: formData.vehiclePlate,
  });

  return {
    formData,
    setFormData,
    handleItemChange,
    handleAddIssue,
    handleUpdateIssue,
    handleRemoveIssue,
    handleExcessChange,
    unknownItems,
    handleAddUnknownItem,
    handleUpdateUnknownItem,
    handleRemoveUnknownItem,
    incompleteUnknownCount,
    isAllComplete,
    isTransporterValid,
    buildPayload,
    resetForm,
    initializedForId,
  };
}