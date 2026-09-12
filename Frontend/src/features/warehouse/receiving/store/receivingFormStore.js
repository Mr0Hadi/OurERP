import { create } from 'zustand';
import { toDateOnly } from '@/shared/lib/dateUtils';

// این استور در localStorage ذخیره نمی‌شود؛ فرم دریافت داده‌ای موقتی
// و لحظه‌ای است و باید همیشه از روی آخرین داده‌ی تازه‌ی سرور بازسازی
// شود.
//
// نام فیلدها عیناً همان `ReceivePurchaseCommand` است تا هنگام ثبت هیچ
// ترجمه‌ای لازم نباشد؛ فیلدهای فقط‌نمایشیِ سرِ سند از
// `PurchaseReceivingInfoDto` می‌آیند.
const EMPTY_RECEIVING = {
  purchaseId: '',
  invoiceNumber: '',
  invoiceDate: '',
  status: '',
  supplierId: null,
  supplierName: '',
  // عکس‌های دورهای قبلِ همین خرید — فقط نمایش؛ عکس‌های این دور را
  // خودِ صفحه با `useFileUploadList` نگه می‌دارد.
  receivingImages: [],
  items: [],
  receivedDate: new Date().toISOString().slice(0, 10),
  receivingNote: '',
  driverFullName: '',
  driverPhoneNumber: '',
  vehiclePlate: '',
};

/**
 * `GetPurchaseReceivingInfo` فیلد `updatedAt` ندارد، پس کلیدِ نسخه از
 * محتوا ساخته می‌شود: بعد از هر دورِ دریافت، `stillOwedQuantity`ها عوض
 * می‌شوند و فرم می‌فهمد باید از نو پر شود.
 */
export function receivingInfoVersion(info) {
  if (!info) return null;
  return [
    info.purchaseId,
    info.status,
    (info.items || []).map((i) => `${i.purchaseItemId}:${i.stillOwedQuantity}`).join(','),
    (info.receivingImages || []).length,
  ].join('|');
}

export const useReceivingFormStore = create((set, get) => ({
  formData: { ...EMPTY_RECEIVING },
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  setItems: (items) =>
    set((state) => ({
      formData: { ...state.formData, items },
    })),

  initializeFromReceivingInfo: (info) => {
    const version = receivingInfoVersion(info);
    if (get().initializedForId === version) return;

    // فقط اقلامی که هنوز چیزی از آن‌ها بدهکارند؛ قلمِ کاملاً
    // دریافت‌شده جایی در فرمِ این دور ندارد.
    const items = (info.items || [])
      .filter((item) => item.stillOwedQuantity > 0)
      .map((item) => ({
        purchaseItemId: item.purchaseItemId,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        unitPrice: item.unitPrice,
        orderedQuantity: item.orderedQuantity,
        stillOwedQuantity: item.stillOwedQuantity,
        // مقدارِ همین دور — فیلدِ `ReceivePurchaseItemDto.ReceivedQuantity`.
        // پیش‌فرض روی کلِ باقیمانده است چون حالتِ پرتکرار «همه رسید» است.
        receivedQuantity: item.stillOwedQuantity,
      }));

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_RECEIVING,
        purchaseId: info.purchaseId,
        invoiceNumber: info.invoiceNumber || '',
        invoiceDate: toDateOnly(info.invoiceDate) || '',
        status: info.status ?? '',
        supplierId: info.supplierId ?? null,
        supplierName: info.supplierName || '',
        receivingImages: info.receivingImages || [],
        items,
        receivedDate: new Date().toISOString().slice(0, 10),
      },
    });
  },

  resetForm: () =>
    set({ formData: { ...EMPTY_RECEIVING }, initializedForId: null }),
}));
