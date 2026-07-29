// src/features/warehouse/receiving/hooks/useReceivingForm.js
import { useEffect, useRef } from 'react';
import useReceivingFormStore from '../store/receivingFormStore';

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function useReceivingForm(purchaseData) {
  const store = useReceivingFormStore();
  const {
    formData,
    setFormData,
    setReceivingItems,
    initializeFromPurchase,
    initializedForId,
    resetForm,
  } = store;
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (purchaseData?.id && (isFirstMount.current || initializedForId !== purchaseData.id)) {
      initializeFromPurchase(purchaseData);
      isFirstMount.current = false;
    } else if (
      purchaseData?.status &&
      initializedForId === purchaseData.id &&
      formData.status !== purchaseData.status
    ) {
      setFormData({ status: purchaseData.status });
    }
  }, [purchaseData?.id, purchaseData?.status, initializeFromPurchase, initializedForId, formData.status, setFormData]);

  const shortageOf = (item) => Math.max(0, item.expectedQty - (item.receivedQty || 0));
  const allocatedOf = (item) =>
    (item.issues || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

  // تغییر تعداد دریافتی یک قلم. اگر با این تغییر، کسری کمتر از مجموع
  // تخصیص‌یافته‌ی فعلی شود، ردیف‌های مشکل از انتها (آخرین ردیف اضافه‌شده)
  // به‌ترتیب کوچک/حذف می‌شوند تا مجموع دوباره با کسری جدید همخوان شود.
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

  const isAllComplete = formData.items.every(
    (item) => item.receivedQty >= item.expectedQty
  );

  // هر قلم دارای کسری، باید دقیقاً به همان اندازه‌ی کسری، بین یک یا چند
  // نوع مشکل تخصیص داده شده باشد (نه کمتر، نه بیشتر) تا بتوان دریافت را ثبت کرد.
  const isAllIssuesAllocated = formData.items.every((item) => {
    const shortage = shortageOf(item);
    if (shortage <= 0) return true;
    const issues = item.issues || [];
    if (issues.length === 0) return false;
    const allocated = allocatedOf(item);
    return allocated === shortage && issues.every((i) => (Number(i.qty) || 0) > 0);
  });

  const isTransporterValid =
    !!formData.transporterName?.trim() &&
    (!!formData.transporterNationalId?.trim() || !!formData.vehiclePlate?.trim());

  const buildPayload = () => {
    const allComplete = formData.items.every(
      (item) => item.receivedQty >= item.expectedQty
    );
    const anyReceived = formData.items.some((item) => item.receivedQty > 0);

    let status = formData.status;
    if (allComplete) {
      status = 'received';
    } else if (anyReceived) {
      status = 'partially_received';
    }

    return {
      id: formData.purchaseId,
      status,
      receivedItems: formData.items.map((item) => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        expectedQty: item.expectedQty,
        receivedQty: item.receivedQty,
        // تفکیک انواع مشکل این دور برای همین قلم؛ اگر قلم کامل دریافت
        // شده باشد، آرایه خالی است.
        issues: (item.issues || []).map((i) => ({
          type: i.issueType,
          qty: Number(i.qty) || 0,
          note: i.note || '',
        })),
      })),
      receivingNote: formData.receivingNote,
      receivedDate: formData.receivedDate,
      transporterName: formData.transporterName,
      transporterNationalId: formData.transporterNationalId,
      vehiclePlate: formData.vehiclePlate,
    };
  };

  return {
    formData,
    setFormData,
    handleItemChange,
    handleAddIssue,
    handleUpdateIssue,
    handleRemoveIssue,
    isAllComplete,
    isAllIssuesAllocated,
    isTransporterValid,
    buildPayload,
    resetForm,
    initializedForId,
  };
}