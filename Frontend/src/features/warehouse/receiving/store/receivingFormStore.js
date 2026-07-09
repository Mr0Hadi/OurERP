// src/features/warehouse/receiving/store/receivingFormStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const EMPTY_RECEIVING = {
  purchaseId: '',
  supplierName: '',
  invoiceNumber: '',
  invoiceDate: '',
  status: '',
  items: [],           // هر آیتم: productId, productName, productCode, expectedQty, receivedQty, note
                       // توجه: آیتم‌های خرید تصویر/برند را ذخیره نمی‌کنند؛ این دو در صفحه‌ی
                       // دریافت با استفاده از productId از لیست محصولات enrich می‌شوند.
  receivingNote: '',
  receivedDate: new Date().toISOString().slice(0, 10),
  // اطلاعات تحویل‌دهنده / وسیله نقلیه
  transporterName: '',
  transporterNationalId: '',
  vehiclePlate: '',
};

const useReceivingFormStore = create(
  persist(
    (set, get) => ({
      formData: { ...EMPTY_RECEIVING },
      initializedForId: null,

      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),
      setReceivingItems: (items) =>
        set((state) => ({
          formData: { ...state.formData, items },
        })),
      initializeFromPurchase: (purchaseData) => {
        const { initializedForId } = get();
        if (initializedForId === purchaseData.id) return;

        const receivingItems = (purchaseData.items || []).map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          expectedQty: item.qty,
          receivedQty: item.qty,          // پیش‌فرض: کامل تحویل گرفته شده
          note: '',
        }));

        set({
          initializedForId: purchaseData.id,
          formData: {
            purchaseId: purchaseData.id,
            supplierName: purchaseData.supplierName || '',
            invoiceNumber: purchaseData.invoiceNumber || '',
            invoiceDate: purchaseData.invoiceDate || '',
            status: purchaseData.status || '',
            items: receivingItems,
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
    }),
    {
      name: 'receiving-form-storage',
      partialize: (state) => ({
        formData: state.formData,
        initializedForId: state.initializedForId,
      }),
    }
  )
);

export default useReceivingFormStore;