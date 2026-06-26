// src/features/purchases/store/purchaseFormStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const EMPTY_FORM = {
  supplierId: '',
  supplierName: '',
  invoiceNumber: '',
  invoiceDate: '',
  dueDate: '',
  description: '',
  paymentType: 'cash',
  paidAmount: '',
  checkNumber: '',
  transferRef: '',
  tatus: '',
  items: [],
};

export const usePurchaseFormStore = create(
  persist(
    (set, get) => ({
      formData: { ...EMPTY_FORM },
      initializedForId: null,

      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      setItems: (items) =>
        set((state) => ({
          formData: { ...state.formData, items },
        })),

      initializeForNew: () => {
        const { initializedForId } = get();
        if (initializedForId === 'new') return;

        set({ initializedForId: 'new' });
      },

      initializeFromPurchase: (purchaseData) => {
        const { initializedForId } = get();
        if (initializedForId === purchaseData.id) return;

        const formattedItems = (purchaseData.items || []).map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          unit: item.unit || '',
          qty: item.qty,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
        }));

        set({
          initializedForId: purchaseData.id,
          formData: {
            ...EMPTY_FORM,
            supplierId: purchaseData.supplierId || '',
            supplierName: purchaseData.supplierName || '',
            invoiceNumber: purchaseData.invoiceNumber || '',
            invoiceDate: purchaseData.invoiceDate || '',
            dueDate: purchaseData.dueDate || '',
            description: purchaseData.description || '',
            paymentType: purchaseData.paymentType || 'cash',
            paidAmount: purchaseData.paidAmount?.toString() || '',
            status: purchaseData.status || '',
            items: formattedItems,
          },
        });
      },

      resetForm: () =>
        set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
    }),
    {
      name: 'purchase-form-storage',
      partialize: (state) => ({
        formData: state.formData,
        initializedForId: state.initializedForId,
      }),
    }
  )
);
