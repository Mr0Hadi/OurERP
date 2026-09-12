import { useEffect } from 'react';
import { clampQuantity } from '@/shared/lib/quantityUtils';
import {
  saleShippingVersion,
  useShippingFormStore,
} from '../store/shippingFormStore';

/**
 * فرمِ یک دورِ ارسالِ فروش — قرینه‌ی `useReceivingForm`.
 *
 * `ShipSaleCommand` مفهومِ «مشکل» ندارد و نباید داشته باشد: وقتی *ما*
 * کالا را می‌فرستیم چیزی برای بازرسیِ ورودی نیست؛ مشکلِ محموله را فقط
 * مشتری بعداً از راهِ مرجوعیِ فروش گزارش می‌کند.
 */
export function useShippingForm(sale) {
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

  const handleItemChange = (saleItemId, value) => {
    setItems(
      formData.items.map((item) =>
        item.saleItemId === saleItemId
          ? {
              ...item,
              // سقفِ همین دور، همان چیزی است که بکند هم چک می‌کند:
              // بیشتر از باقیمانده‌ی قلم با ۴۰۰ رد می‌شود (موجودیِ ناکافی
              // هم همان‌جا رد می‌شود و فقط سرور از آن خبر دارد).
              shippedQuantity: clampQuantity(value, item.remainingQuantity),
            }
          : item,
      ),
    );
  };

  const items = formData.items || [];

  const isAllComplete =
    items.length > 0 &&
    items.every((item) => item.shippedQuantity >= item.remainingQuantity);

  const hasSomethingToShip = items.some(
    (item) => (Number(item.shippedQuantity) || 0) > 0,
  );

  /**
   * بدنه‌ی `ShipSaleCommand`. قلمِ با مقدارِ صفر فرستاده نمی‌شود:
   * اعتبارسنجیِ بکند `ShippedQuantity > 0` می‌خواهد و کلِ درخواست را
   * به‌خاطرِ یک ردیفِ صفر رد می‌کند.
   *
   * `productUnitBarcodes` فقط وقتی فرستاده می‌شود که واقعاً اسکن شده
   * باشد؛ بکند تعدادش را با `shippedQuantity` می‌سنجد و آرایه‌ی ناقص
   * درخواست را رد می‌کند. `null` یعنی «خودت FIFO انتخاب کن».
   */
  const buildCommand = () => ({
    saleId: formData.saleId,
    shippedDate: formData.shippedDate || undefined,
    shippingNote: formData.shippingNote || undefined,
    driverFullName: formData.driverFullName || undefined,
    driverPhoneNumber: formData.driverPhoneNumber || undefined,
    vehiclePlate: formData.vehiclePlate || undefined,
    items: items
      .filter((item) => (Number(item.shippedQuantity) || 0) > 0)
      .map((item) => ({
        saleItemId: item.saleItemId,
        shippedQuantity: Number(item.shippedQuantity) || 0,
        productUnitBarcodes: item.productUnitBarcodes?.length
          ? item.productUnitBarcodes
          : null,
      })),
  });

  return {
    formData,
    setFormData,
    handleItemChange,
    isAllComplete,
    hasSomethingToShip,
    buildCommand,
    resetForm,
  };
}
