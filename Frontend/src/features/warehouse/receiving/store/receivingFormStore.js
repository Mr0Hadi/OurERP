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
  // کالایی که بدون قلم رسیده — `ReceivePurchaseCommand.UnlistedItems`.
  unlistedItems: [],
  receivedDate: new Date().toISOString().slice(0, 10),
  receivingNote: '',
  driverFullName: '',
  driverPhoneNumber: '',
  vehiclePlate: '',
};

/**
 * `GetPurchaseReceivingInfo` فیلد `updatedAt` ندارد، پس کلیدِ نسخه از
 * محتوا ساخته می‌شود: بعد از هر دورِ دریافت، باقیمانده و قرنطینه عوض
 * می‌شوند و فرم می‌فهمد باید از نو پر شود.
 */
export function receivingInfoVersion(info) {
  if (!info) return null;
  return [
    info.purchaseId,
    info.status,
    (info.items || [])
      .map(
        (i) =>
          `${i.purchaseItemId}:${i.stillOwedQuantity}:${i.quarantinedOnOrderQuantity}:${i.quarantinedExcessQuantity}`,
      )
      .join(','),
    (info.unlistedItems || []).map((u) => `${u.productId}:${u.quarantinedQuantity}`).join(','),
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
  setUnlistedItems: (unlistedItems) =>
    set((state) => ({
      formData: { ...state.formData, unlistedItems },
    })),

  initializeFromReceivingInfo: (info) => {
    const version = receivingInfoVersion(info);
    if (get().initializedForId === version) return;

    // همه‌ی اقلام می‌مانند، حتی قلمِ کامل‌رسیده: مازادِ دیرتر کشف‌شده هم
    // روی همان قلم ثبت می‌شود.
    const items = (info.items || []).map((item) => ({
      rowKey: `i-${item.purchaseItemId}`,
      purchaseItemId: item.purchaseItemId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      unitPrice: item.unitPrice,
      orderedQuantity: item.orderedQuantity,
      receivedQuantity: item.receivedQuantity,
      stillOwedQuantity: item.stillOwedQuantity,
      quarantinedOnOrderQuantity: item.quarantinedOnOrderQuantity ?? 0,
      quarantinedExcessQuantity: item.quarantinedExcessQuantity ?? 0,
      // `ReceivePurchaseItemDto.ArrivedQuantity` — کلِ آنچه از این قلم
      // رسید، سالم و خراب. پیش‌فرض روی باقیمانده چون حالتِ پرتکرار «همه
      // رسید» است؛ بیشتر از آن هم مجاز است.
      arrivedQuantity: item.stillOwedQuantity,
      defects: [],
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
        unlistedItems: [],
        receivedDate: new Date().toISOString().slice(0, 10),
      },
    });
  },

  resetForm: () =>
    set({ formData: { ...EMPTY_RECEIVING }, initializedForId: null }),
}));
