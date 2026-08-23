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
    (item.issues || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

  const handleItemChange = (lineId, field, value) => {
    const newItems = formData.items.map((item) => {
      if (item.lineId !== lineId) return item;
      const updated = { ...item, [field]: value };

      if (field === 'receivedQty') {
        let remainingBudget = issueBudgetOf(updated);
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
            qty: remaining,
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
        if (field === 'qty') {
          const otherAllocated = (item.issues || [])
            .filter((i) => i.id !== issueRowId)
            .reduce((s, i) => s + (Number(i.qty) || 0), 0);
          const maxAllowed = Math.max(0, budget - otherAllocated);
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
    (item) => item.receivedQty >= item.expectedQty,
  );

  // خطوط به تفکیک منبع، برای اینکه صفحه هرکدام را زیر عنوان خودش
  // نشان بدهد بدون اینکه منطق فرم دو شاخه شود.
  const linesBySource = formData.items.reduce((acc, item) => {
    (acc[item.source] ||= []).push(item);
    return acc;
  }, {});

  const isTransporterValid =
    !!formData.transporterName?.trim() &&
    (!!formData.transporterNationalId?.trim() || !!formData.vehiclePlate?.trim());

  const buildPayload = () => ({
    id: formData.purchaseId,
    receivedItems: formData.items.map((item) => ({
      lineId: item.lineId,
      source: item.source,
      returnId: item.returnId,
      effectId: item.effectId,
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
    linesBySource,
    isTransporterValid,
    buildPayload,
    resetForm,
    initializedForId,
  };
}