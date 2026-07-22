// src/features/warehouse/receiving/hooks/useReceivingForm.js
import { useEffect, useRef } from 'react';
import useReceivingFormStore from '../store/receivingFormStore';

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

  const handleItemChange = (productId, field, value) => {
    const newItems = formData.items.map((item) =>
      item.productId === productId ? { ...item, [field]: value } : item
    );
    setReceivingItems(newItems);
  };

  const isAllComplete = formData.items.every(
    (item) => item.receivedQty >= item.expectedQty
  );
  const isPartially = formData.items.some(
    (item) => item.receivedQty > 0 && item.receivedQty < item.expectedQty
  );

  // برای ثبت هر دو نوع دریافت، مشخص کردن هویت تحویل‌دهنده الزامی است:
  // حداقل یکی از «نام و نام خانوادگی» و یکی از «کد ملی» یا «شماره پلاک» باید پر شده باشد.
  const isTransporterValid =
    !!formData.transporterName?.trim() &&
    (!!formData.transporterNationalId?.trim() || !!formData.vehiclePlate?.trim());

  const buildPayload = () => {
    const allComplete = formData.items.every(
      (item) => item.receivedQty >= item.expectedQty
    );
    const anyReceived = formData.items.some((item) => item.receivedQty > 0);

    let status = formData.status; // existing status
    if (allComplete) {
      status = 'received';
    } else if (anyReceived) {
      status = 'partially_received';
    }
    // if nothing received, maybe keep status as shipped? but we can let user decide

    return {
      id: formData.purchaseId,
      status,
      receivedItems: formData.items.map((item) => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        expectedQty: item.expectedQty,
        receivedQty: item.receivedQty,
        note: item.note || '',
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
    isAllComplete,
    isPartially,
    isTransporterValid,
    buildPayload,
    resetForm,
    initializedForId,
  };
}