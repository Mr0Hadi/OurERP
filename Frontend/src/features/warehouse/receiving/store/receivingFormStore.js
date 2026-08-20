import { create } from 'zustand';

// این استور در localStorage ذخیره نمی‌شود؛ فرم دریافت داده‌ای موقتی
// و لحظه‌ای است و باید همیشه از روی آخرین داده‌ی تازه‌ی سرور بازسازی
// شود.
const EMPTY_RECEIVING = {
  purchaseId: '',
  supplierName: '',
  invoiceNumber: '',
  invoiceDate: '',
  status: '',
  items: [],
  // کالاهایی که اصلاً در سیستم ما تعریف نشده‌اند و به هیچ قلم سفارش
  // وصل نمی‌شوند؛ انباردار فقط شرح و تعداد را می‌نویسد و اتصال به یک
  // کالای واقعی تا لحظه‌ی تصمیمِ «نگهداری» به تعویق می‌افتد.
  unknownItems: [],
  receivingNote: '',
  receivedDate: new Date().toISOString().slice(0, 10),
  transporterName: '',
  transporterNationalId: '',
  vehiclePlate: '',
};

export const useReceivingFormStore = create((set, get) => ({
  formData: { ...EMPTY_RECEIVING },
  // کلید نسخه شامل updatedAt خرید است، نه فقط id — چون وقتی همان
  // خرید دوباره برای دور دومِ دریافت باز می‌شود، id عوض نمی‌شود ولی
  // updatedAt چرا؛ بدون این، اگر یک اسنپ‌شات قدیمی زودتر از دیتای
  // تازه رندر شود، فرم با دیتای قدیمی می‌ماند.
  initializedForId: null,

  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  setReceivingItems: (items) =>
    set((state) => ({
      formData: { ...state.formData, items },
    })),
  setUnknownItems: (unknownItems) =>
    set((state) => ({
      formData: { ...state.formData, unknownItems },
    })),
  initializeFromPurchase: (purchaseData) => {
    const { initializedForId } = get();
    const version = `${purchaseData.id}:${purchaseData.updatedAt}`;
    if (initializedForId === version) return;

    const receivingItems = (purchaseData.items || [])
      .map((item) => {
        // receivableQty از سرور می‌آید و دقیق‌ترین محاسبه‌ی «الان چقدر
        // واقعاً قابل دریافت است» را دارد (با در نظر گرفتن مشکلات
        // گزارش‌شده‌ی حل‌نشده و مرجوعی‌های فعال). فرمول ساده‌ی
        // qty−received−settled فقط به‌عنوان fallback ایمنی نگه داشته
        // شده.
        const remaining =
          item.receivableQty != null
            ? item.receivableQty
            : Math.max(
                0,
                item.qty - (item.receivedQty || 0) - (item.settledQty || 0),
              );
        return {
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          expectedQty: remaining,
          receivedQty: remaining,
          issues: [],
          // مازادِ همین قلم: تعدادی که *بیشتر* از سفارش رسیده. عمداً
          // بیرون از receivedQty نگه داشته می‌شود تا معنای «چقدر از
          // سفارش تحویل شد» و تمام محاسباتی که به آن وابسته‌اند دست
          // نخورد.
          excessQty: 0,
          excessNote: '',
        };
      })
      .filter((item) => item.expectedQty > 0);

    set({
      initializedForId: version,
      formData: {
        purchaseId: purchaseData.id,
        supplierName: purchaseData.supplierName || '',
        invoiceNumber: purchaseData.invoiceNumber || '',
        invoiceDate: purchaseData.invoiceDate || '',
        status: purchaseData.status || '',
        items: receivingItems,
        unknownItems: [],
        receivingNote: '',
        receivedDate: new Date().toISOString().slice(0, 10),
        transporterName: '',
        transporterNationalId: '',
        vehiclePlate: '',
      },
    });
  },
  resetForm: () =>
    set({ formData: { ...EMPTY_RECEIVING }, initializedForId: null }),
}));
