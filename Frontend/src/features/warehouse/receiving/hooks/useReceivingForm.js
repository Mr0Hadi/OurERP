import { useEffect } from 'react';
import { clampQuantity } from '@/shared/lib/quantityUtils';
import {
  receivingInfoVersion,
  useReceivingFormStore,
} from '../store/receivingFormStore';

/**
 * فرمِ یک دورِ دریافتِ خرید.
 *
 * فقط «چقدر از هر قلم رسید» و مشخصاتِ محموله را می‌گیرد. گزارشِ مغایرت
 * اینجا نیست: `ReceivePurchaseCommand` عمداً چنین فیلدی ندارد و
 * کسری/آسیب/اشتباه باید جدا با `CreatePurchaseReturn` (صفحه‌ی مرجوعیِ
 * خرید) ثبت شود.
 */
export function useReceivingForm(receivingInfo) {
  const {
    formData,
    setFormData,
    setItems,
    initializeFromReceivingInfo,
    initializedForId,
    resetForm,
  } = useReceivingFormStore();

  const version = receivingInfoVersion(receivingInfo);

  useEffect(() => {
    if (version && initializedForId !== version) {
      initializeFromReceivingInfo(receivingInfo);
    }
  }, [version, receivingInfo, initializeFromReceivingInfo, initializedForId]);

  const handleItemChange = (purchaseItemId, value) => {
    setItems(
      formData.items.map((item) =>
        item.purchaseItemId === purchaseItemId
          ? {
              ...item,
              // سقفِ همین دور، همان چیزی است که بکند هم چک می‌کند:
              // بیشتر از باقیمانده‌ی قلم با ۴۰۰ رد می‌شود.
              receivedQuantity: clampQuantity(value, item.stillOwedQuantity),
            }
          : item,
      ),
    );
  };

  const items = formData.items || [];

  const isAllComplete =
    items.length > 0 &&
    items.every((item) => item.receivedQuantity >= item.stillOwedQuantity);

  const hasSomethingToReceive = items.some(
    (item) => (Number(item.receivedQuantity) || 0) > 0,
  );

  /**
   * بدنه‌ی `ReceivePurchaseCommand`. قلمِ با مقدارِ صفر فرستاده نمی‌شود:
   * اعتبارسنجیِ بکند `ReceivedQuantity > 0` می‌خواهد و کلِ درخواست را
   * به‌خاطرِ یک ردیفِ صفر رد می‌کند.
   *
   * @param images خروجیِ `filesPayload` آپلودرِ صفحه — `{objectKey,
   *   fileName?, note?}[]`، همان `ReceivePurchaseImageDto`.
   */
  const buildCommand = (images = []) => ({
    purchaseId: formData.purchaseId,
    receivedDate: formData.receivedDate || undefined,
    receivingNote: formData.receivingNote || undefined,
    driverFullName: formData.driverFullName || undefined,
    driverPhoneNumber: formData.driverPhoneNumber || undefined,
    vehiclePlate: formData.vehiclePlate || undefined,
    items: items
      .filter((item) => (Number(item.receivedQuantity) || 0) > 0)
      .map((item) => ({
        purchaseItemId: item.purchaseItemId,
        receivedQuantity: Number(item.receivedQuantity) || 0,
      })),
    images,
  });

  return {
    formData,
    setFormData,
    handleItemChange,
    isAllComplete,
    hasSomethingToReceive,
    buildCommand,
    resetForm,
  };
}
