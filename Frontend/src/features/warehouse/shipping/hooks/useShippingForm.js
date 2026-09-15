import { useEffect } from 'react';
import { clampQuantity } from '@/shared/lib/quantityUtils';
import {
  saleShippingVersion,
  useShippingFormStore,
} from '../store/shippingFormStore';

// مازاد سقفِ منطقی ندارد؛ این فقط حدِ عملیِ ورودیِ شمارنده است.
export const EXCESS_QUANTITY_CAP = 99999;

const fa = (value) => (Number(value) || 0).toLocaleString('fa-IR');

/**
 * فرمِ یک دورِ ارسالِ فروش — قرینه‌ی `useReceivingForm`.
 *
 * هر قلم دو مقدار دارد: `shippedQuantity` (سهمِ سفارش، تا باقیمانده) و
 * `excessQuantity` (بیش از سفارش رفته — درآمد ندارد و سقفِ ادعای EXCESSِ
 * مشتری است). برای کالای ردیابی‌پذیر، اسکنِ دانه‌های هر دو الزامی است.
 *
 * @param isTracked (productId) => آیا کالا `requiresUnitTracking` دارد.
 */
export function useShippingForm(sale, { isTracked = () => false } = {}) {
  const {
    formData,
    setFormData,
    setItems,
    initializeFromSale,
    initializedForId,
    resetForm,
  } = useShippingFormStore();

  const version = saleShippingVersion(sale);

  useEffect(() => {
    if (version && initializedForId !== version) {
      initializeFromSale(sale);
    }
  }, [version, sale, initializeFromSale, initializedForId]);

  const items = formData.items || [];

  const patchItem = (saleItemId, patch) =>
    setItems(
      items.map((item) =>
        item.saleItemId === saleItemId ? { ...item, ...patch(item) } : item,
      ),
    );

  const handleItemChange = (saleItemId, value) =>
    patchItem(saleItemId, (item) => {
      // سقفِ همین دور، همان چیزی است که بکند هم چک می‌کند.
      const shippedQuantity = clampQuantity(value, item.remainingQuantity);
      return {
        shippedQuantity,
        productUnitBarcodes: item.productUnitBarcodes.slice(0, shippedQuantity),
      };
    });

  const handleExcessChange = (saleItemId, value) =>
    patchItem(saleItemId, (item) => {
      const excessQuantity = clampQuantity(value, EXCESS_QUANTITY_CAP);
      return {
        excessQuantity,
        excessProductUnitBarcodes: item.excessProductUnitBarcodes.slice(0, excessQuantity),
      };
    });

  /** `field` یکی از `productUnitBarcodes` / `excessProductUnitBarcodes`. */
  const handleBarcodesChange = (saleItemId, field, barcodes) =>
    patchItem(saleItemId, () => ({ [field]: barcodes }));

  const isAllComplete =
    items.length > 0 &&
    items.every((item) => item.shippedQuantity >= item.remainingQuantity);

  const hasSomethingToShip = items.some(
    (item) =>
      (Number(item.shippedQuantity) || 0) + (Number(item.excessQuantity) || 0) > 0,
  );

  /** نخستین دلیلی که سرور درخواست را با آن رد می‌کند. */
  const blockingReason = (() => {
    for (const item of items) {
      const checks = [
        [item.shippedQuantity, item.productUnitBarcodes, 'ارسالی'],
        [item.excessQuantity, item.excessProductUnitBarcodes, 'مازاد'],
      ];
      for (const [quantity, barcodes, label] of checks) {
        const count = Number(quantity) || 0;
        if (count <= 0) continue;
        if (isTracked(item.productId) && barcodes.length !== count) {
          return `«${item.productName}» ردیابی‌پذیر است؛ همه‌ی ${fa(count)} دانه‌ی ${label} را اسکن کنید`;
        }
        if (barcodes.length > 0 && barcodes.length !== count) {
          return `تعداد دانه‌های اسکن‌شده‌ی ${label} «${item.productName}» با مقدارش برابر نیست`;
        }
      }
    }
    return null;
  })();

  /**
   * بدنه‌ی `ShipSaleCommand`، یا `null` وقتی از فروش چیزی نمی‌رود (محموله
   * فقط کالای جایگزینِ مرجوعی است). بارکد فقط وقتی فرستاده می‌شود که واقعاً
   * اسکن شده باشد — `null` یعنی «خودت FIFO انتخاب کن».
   */
  const buildCommand = () => {
    const commandItems = items
      .filter(
        (item) =>
          (Number(item.shippedQuantity) || 0) + (Number(item.excessQuantity) || 0) > 0,
      )
      .map((item) => ({
        saleItemId: item.saleItemId,
        shippedQuantity: Number(item.shippedQuantity) || 0,
        productUnitBarcodes: item.productUnitBarcodes.length
          ? item.productUnitBarcodes
          : null,
        excessQuantity: Number(item.excessQuantity) || 0,
        excessProductUnitBarcodes: item.excessProductUnitBarcodes.length
          ? item.excessProductUnitBarcodes
          : null,
      }));
    if (commandItems.length === 0) return null;

    return {
      saleId: formData.saleId,
      shippedDate: formData.shippedDate || undefined,
      shippingNote: formData.shippingNote || undefined,
      driverFullName: formData.driverFullName || undefined,
      driverPhoneNumber: formData.driverPhoneNumber || undefined,
      vehiclePlate: formData.vehiclePlate || undefined,
      items: commandItems,
    };
  };

  return {
    formData,
    setFormData,
    items,
    handleItemChange,
    handleExcessChange,
    handleBarcodesChange,
    isAllComplete,
    hasSomethingToShip,
    blockingReason,
    buildCommand,
    resetForm,
  };
}
