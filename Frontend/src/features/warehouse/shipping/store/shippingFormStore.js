import { create } from 'zustand';
import { toDateOnly } from '@/shared/lib/dateUtils';

// این استور در localStorage ذخیره نمی‌شود؛ فرم ارسال داده‌ای موقتی و
// لحظه‌ای است و باید همیشه از روی آخرین داده‌ی تازه‌ی سرور بازسازی شود.
//
// نام فیلدها عیناً همان `ShipSaleCommand` است تا هنگام ثبت هیچ ترجمه‌ای
// لازم نباشد؛ فیلدهای فقط‌نمایشیِ سرِ سند از `SaleDto` می‌آیند.
const EMPTY_SHIPPING = {
  saleId: '',
  invoiceNumber: '',
  invoiceDate: '',
  status: '',
  customerId: null,
  customerName: '',
  items: [],
  shippedDate: new Date().toISOString().slice(0, 10),
  shippingNote: '',
  driverFullName: '',
  driverPhoneNumber: '',
  vehiclePlate: '',
};

/**
 * `GetSaleDetail` فیلد `updatedAt` ندارد، پس کلیدِ نسخه از محتوا ساخته
 * می‌شود: بعد از هر دورِ ارسال، `shippedQuantity`ها عوض می‌شوند و فرم
 * می‌فهمد باید از نو پر شود.
 */
export function saleShippingVersion(sale) {
  if (!sale) return null;
  return [
    sale.id,
    sale.status,
    (sale.items || []).map((i) => `${i.id}:${i.shippedQuantity}`).join(','),
  ].join('|');
}

export const useShippingFormStore = create((set, get) => ({
  formData: { ...EMPTY_SHIPPING },
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  setItems: (items) =>
    set((state) => ({
      formData: { ...state.formData, items },
    })),

  initializeFromSale: (sale) => {
    const version = saleShippingVersion(sale);
    if (get().initializedForId === version) return;

    // معادلِ `StillOwedQuantity`ِ سمتِ خرید اینجا وجود ندارد؛ باقیمانده
    // از خودِ `SaleItemDto` حساب می‌شود — همان تفاضلی که بکند هم در
    // `ShipSaleCommandHandler` چک می‌کند.
    const items = (sale.items || [])
      .map((item) => ({
        // `SaleItem.Id` — فیلدِ `ShipSaleItemDto.SaleItemId`.
        saleItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        remainingQuantity: Math.max(
          0,
          (item.quantity || 0) - (item.shippedQuantity || 0),
        ),
        // مقدارِ همین دور — فیلدِ `ShipSaleItemDto.ShippedQuantity`.
        shippedQuantity: Math.max(
          0,
          (item.quantity || 0) - (item.shippedQuantity || 0),
        ),
        // بارکدِ واحدهای اسکن‌شده؛ خالی یعنی بکند خودش FIFO انتخاب کند.
        productUnitBarcodes: [],
      }))
      .filter((item) => item.remainingQuantity > 0);

    set({
      initializedForId: version,
      formData: {
        ...EMPTY_SHIPPING,
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber || '',
        invoiceDate: toDateOnly(sale.invoiceDate) || '',
        status: sale.status ?? '',
        customerId: sale.customerId ?? null,
        customerName: sale.customerName || '',
        items,
        shippedDate: new Date().toISOString().slice(0, 10),
      },
    });
  },

  resetForm: () =>
    set({ formData: { ...EMPTY_SHIPPING }, initializedForId: null }),
}));
