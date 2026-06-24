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

export const useSaleFormStore = create((set) => ({
  formData: { ...EMPTY_FORM },
  returnPath: null,

  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),

  setItems: (items) =>
    set((state) => ({
      formData: { ...state.formData, items },
    })),

  setReturnPath: (path) => set({ returnPath: path }),
  clearReturnPath: () => set({ returnPath: null }),

  resetForm: () => set({ formData: { ...EMPTY_FORM }, returnPath: null }),
}));
