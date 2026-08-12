import { useEffect } from 'react';
import { useShippingFormStore } from '../store/shippingFormStore';

export function useShippingForm(saleData) {
  const store = useShippingFormStore();
  const {
    formData,
    setFormData,
    setShippingItems,
    initializeFromSale,
    initializedForId,
    resetForm,
  } = store;

  const saleVersion =
    saleData?.id != null ? `${saleData.id}:${saleData.updatedAt}` : null;

  useEffect(() => {
    if (saleVersion && initializedForId !== saleVersion) {
      initializeFromSale(saleData);
    }
  }, [saleVersion, saleData, initializeFromSale, initializedForId]);

  const clampQty = (value, expectedQty) => {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return 0;
    return Math.min(num, expectedQty);
  };

  const handleItemChange = (productId, field, value) => {
    const newItems = formData.items.map((item) =>
      item.productId === productId
        ? { ...item, [field]: clampQty(value, item.expectedQty) }
        : item,
    );
    setShippingItems(newItems);
  };

  const isAllComplete = formData.items.every(
    (item) => (item.shippedQty || 0) >= item.expectedQty,
  );

  const isDriverValid =
    !!formData.driverName?.trim() &&
    (!!formData.driverNationalId?.trim() || !!formData.vehiclePlate?.trim());

  const buildPayload = () => ({
    id: formData.saleId,
    shippedItems: formData.items.map((item) => ({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      expectedQty: item.expectedQty,
      shippedQty: item.shippedQty,
    })),
    shippingNote: formData.shippingNote,
    shippedDate: formData.shippedDate,
    driverName: formData.driverName,
    driverNationalId: formData.driverNationalId,
    vehiclePlate: formData.vehiclePlate,
  });

  return {
    formData,
    setFormData,
    handleItemChange,
    isAllComplete,
    isDriverValid,
    buildPayload,
    resetForm,
    initializedForId,
  };
}
