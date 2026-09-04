import { useEffect } from 'react';
import { useReceivingFormStore } from '../store/receivingFormStore';
import {
  defaultIssueTypeFor,
  issueBudgetOf,
} from '../domain/issueSemantics';

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * purchaseData می‌تواند null باشد: صفحه‌ی دریافت کالای برگشتی از مشتری
 * خودش استور را با initializeFromSalesReturn پر می‌کند و فقط
 * هندلرهای این هوک را می‌خواهد.
 */
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

  const allocatedOf = (item) =>
    (item.issues || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  const handleItemChange = (lineId, field, value) => {
    const newItems = formData.items.map((item) => {
      if (item.lineId !== lineId) return item;
      const updated = { ...item, [field]: value };

      if (field === 'receivedQuantity') {
        let remainingBudget = issueBudgetOf(updated);
        const trimmedIssues = [];
        for (const issue of updated.issues || []) {
          if (remainingBudget <= 0) break;
          const quantity = Math.min(Number(issue.quantity) || 0, remainingBudget);
          if (quantity > 0) {
            trimmedIssues.push({ ...issue, quantity });
            remainingBudget -= quantity;
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
  const handleAddIssue = (lineId) => {
    const newItems = formData.items.map((item) => {
      if (item.lineId !== lineId) return item;
      const budget = issueBudgetOf(item);
      const allocated = allocatedOf(item);
      const remaining = Math.max(0, budget - allocated);
      if (remaining <= 0) return item;
      return {
        ...item,
        issues: [
          ...(item.issues || []),
          {
            id: generateId(),
            issueType: defaultIssueTypeFor(item),
            quantity: remaining,
            note: '',
          },
        ],
      };
    });
    setReceivingItems(newItems);
  };

  const handleUpdateIssue = (lineId, issueRowId, field, value) => {
    const newItems = formData.items.map((item) => {
      if (item.lineId !== lineId) return item;
      const budget = issueBudgetOf(item);

      const newIssues = (item.issues || []).map((issue) => {
        if (issue.id !== issueRowId) return issue;
        if (field === 'quantity') {
          const otherAllocated = (item.issues || [])
            .filter((i) => i.id !== issueRowId)
            .reduce((s, i) => s + (Number(i.quantity) || 0), 0);
          const maxAllowed = Math.max(0, budget - otherAllocated);
          const num = Number(value);
          const clamped = Number.isNaN(num) || num < 0 ? 0 : Math.min(num, maxAllowed);
          return { ...issue, quantity: clamped };
        }
        return { ...issue, [field]: value };
      });

      return { ...item, issues: newIssues };
    });
    setReceivingItems(newItems);
  };

  const handleRemoveIssue = (lineId, issueRowId) => {
    const newItems = formData.items.map((item) =>
      item.lineId === lineId
        ? { ...item, issues: (item.issues || []).filter((i) => i.id !== issueRowId) }
        : item,
    );
    setReceivingItems(newItems);
  };

  // ── مازادِ یک قلم شناخته‌شده ───────────────────────────────────────
  // برخلاف کسری، مازاد از روی تعدادها قابل استنتاج نیست (چون سقف
  // دریافتی همان سفارش است)؛ انباردار باید صریحاً اعلامش کند. سقفی
  // هم ندارد — تامین‌کننده هر تعدادی ممکن است اضافه فرستاده باشد.
  const handleExcessChange = (lineId, field, value) => {
    const newItems = formData.items.map((item) => {
      if (item.lineId !== lineId) return item;
      if (field === 'excessQuantity') {
        const num = Number(value);
        const safe = Number.isNaN(num) || num < 0 ? 0 : Math.floor(num);
        // با صفرشدن تعداد، یادداشتِ بی‌صاحب هم پاک می‌شود تا چیزی که
        // ثبت نمی‌شود روی صفحه باقی نماند.
        return { ...item, excessQuantity: safe, excessNote: safe > 0 ? item.excessNote : '' };
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
      { id: generateId(), productName: '', quantity: 1, unit: 'عدد', note: '' },
    ]);
  };

  const handleUpdateUnknownItem = (rowId, field, value) => {
    setUnknownItems(
      unknownItems.map((row) => {
        if (row.id !== rowId) return row;
        if (field === 'quantity') {
          const num = Number(value);
          const safe = Number.isNaN(num) || num < 0 ? 0 : Math.floor(num);
          return { ...row, quantity: safe };
        }
        return { ...row, [field]: value };
      }),
    );
  };

  const handleRemoveUnknownItem = (rowId) => {
    setUnknownItems(unknownItems.filter((row) => row.id !== rowId));
  };

  const isUnknownRowComplete = (row) =>
    !!row.productName?.trim() && (Number(row.quantity) || 0) > 0;

  // ردیف‌های نیمه‌پرشده بی‌صدا حذف نمی‌شوند — انباردار باید ببیند که
  // چیزی که نوشته ثبت نخواهد شد.
  const incompleteUnknownCount = unknownItems.filter(
    (row) =>
      !isUnknownRowComplete(row) &&
      (!!row.productName?.trim() || (Number(row.quantity) || 0) > 0 || !!row.note?.trim()),
  ).length;

  const isAllComplete = formData.items.every(
    (item) => item.receivedQuantity >= item.expectedQuantity,
  );

  // خطوط به تفکیک منبع، برای اینکه صفحه هرکدام را زیر عنوان خودش
  // نشان بدهد بدون اینکه منطق فرم دو شاخه شود.
  const linesBySource = formData.items.reduce((acc, item) => {
    (acc[item.source] ||= []).push(item);
    return acc;
  }, {});

  const buildPayload = () => ({
    id: formData.purchaseId,
    receivedItems: formData.items.map((item) => ({
      lineId: item.lineId,
      source: item.source,
      returnId: item.returnId,
      effectId: item.effectId,
      purchaseItemId: item.purchaseItemId ?? null,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      expectedQuantity: item.expectedQuantity,
      receivedQuantity: item.receivedQuantity,
      issues: (item.issues || []).map((i) => ({
        type: i.issueType,
        quantity: Number(i.quantity) || 0,
        note: i.note || '',
      })),
      excessQuantity: Number(item.excessQuantity) || 0,
      excessNote: item.excessNote || '',
    })),
    unknownItems: unknownItems.filter(isUnknownRowComplete).map((row) => ({
      productName: row.productName.trim(),
      quantity: Number(row.quantity) || 0,
      unit: row.unit?.trim() || 'عدد',
      note: row.note || '',
    })),
    receivingNote: formData.receivingNote,
    receivedDate: formData.receivedDate,
    transporterName: formData.transporterName,
    transporterPhone: formData.transporterPhone,
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
    linesBySource,
    buildPayload,
    resetForm,
    initializedForId,
  };
}