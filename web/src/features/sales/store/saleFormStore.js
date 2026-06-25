// src/features/sales/store/saleFormStore.js
import { create } from 'zustand';

const EMPTY_FORM = {
  customerId: '',
  customerName: '',
  invoiceNumber: '',
  invoiceDate: '',
  dueDate: '',
  description: '',
  paymentType: 'cash',
  paidAmount: '',
  items: [],
};

export const useSaleFormStore = create((set, get) => ({
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
    if (initializedForId === 'new') return; // guard: اگر قبلاً init شده، کاری نکن

    set({
      initializedForId: 'new',
      formData: { ...EMPTY_FORM },
    });
  },

  initializeFromSale: (sale) => {
    const { initializedForId } = get();
    if (initializedForId === sale.id) return;

    set({
      initializedForId: sale.id,
      formData: {
        customerId: sale.customerId || '',
        customerName: sale.customerName || '',
        invoiceNumber: sale.invoiceNumber || '',
        invoiceDate: sale.invoiceDate || '',
        dueDate: sale.dueDate || '',
        description: sale.description || '',
        paymentType: sale.paymentType || 'cash',
        paidAmount: sale.paidAmount?.toString() || '',
        items: sale.items || [],
      },
    });
  },

  resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
}));
