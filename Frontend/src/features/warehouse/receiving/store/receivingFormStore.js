// src/features/warehouse/receiving/store/receivingFormStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const EMPTY_RECEIVING = {
  purchaseId: '',
  supplierName: '',
  invoiceNumber: '',
  invoiceDate: '',
  status: '',
  items: [],           // هر آیتم: productId, productName, productCode, expectedQty, receivedQty, issueType, note
  receivingNote: '',
  receivedDate: new Date().toISOString().slice(0, 10),
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

        // فقط باقیمانده‌ی هر قلم — سفارش منهای آنچه قبلاً دریافت شده
        // (receivedQty) و منهای آنچه از طریق مرجوعی به‌طور کامل تسویه
        // شده (settledQty) — به‌عنوان «مورد انتظار» این دور نمایش داده می‌شود.
        const receivingItems = (purchaseData.items || [])
          .map((item) => {
            const receivedSoFar = item.receivedQty || 0;
            const settledSoFar = item.settledQty || 0;
            const remaining = Math.max(0, item.qty - receivedSoFar - settledSoFar);
            return {
              productId: item.productId,
              productName: item.productName,
              productCode: item.productCode,
              expectedQty: remaining,
              receivedQty: remaining, // پیش‌فرض: باقیمانده کامل دریافت شده
              // اگر این قلم پیش‌تر هم مشکلی گزارش شده بود، همان نوع مشکل
              // به‌عنوان پیش‌فرض این دور هم انتخاب می‌شود
              issueType: item.lastIssueType || 'shortage',
              note: '',
            };
          })
          .filter((item) => item.expectedQty > 0);

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