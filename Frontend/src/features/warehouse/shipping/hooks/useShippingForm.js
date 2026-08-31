import { useEffect } from 'react';
import { useShippingFormStore } from '../store/shippingFormStore';
import { clampQty } from "@/shared/utils/qtyUtils";

/**
 * saleData می‌تواند null باشد: صفحه‌ی عودت به تامین‌کننده خودش استور را
 * با initializeFromReturn پر می‌کند و فقط هندلرهای این هوک را می‌خواهد.
 */
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

  const handleItemChange = (lineId, field, value) => {
    const newItems = formData.items.map((item) =>
      item.lineId === lineId
        ? { ...item, [field]: clampQty(value, item.expectedQty) }
        : item,
    );
    setShippingItems(newItems);
  };

  const isAllComplete = formData.items.every(
    (item) => (item.shippedQty || 0) >= item.expectedQty,
  );

  const buildPayload = () => ({
    id: formData.saleId,
    shippedItems: formData.items.map((item) => ({
      lineId: item.lineId,
      source: item.source,
      returnId: item.returnId,
      effectId: item.effectId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      expectedQty: item.expectedQty,
      shippedQty: item.shippedQty,
    })),
    shippingNote: formData.shippingNote,
    shippedDate: formData.shippedDate,
    driverName: formData.driverName,
    driverPhone: formData.driverPhone,
    vehiclePlate: formData.vehiclePlate,
  });

  return {
    formData,
    setFormData,
    handleItemChange,
    isAllComplete,
    buildPayload,
    resetForm,
    initializedForId,
  };
}
