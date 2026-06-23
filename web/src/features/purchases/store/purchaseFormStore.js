import { create } from 'zustand';

const EMPTY_FORM = {
  supplierId: '',
  supplierName: '',
  invoiceNumber: '',
  invoiceDate: '',
  description: '',
  paymentType: 'cash',
  paidAmount: '',
  items: [],
};

export const usePurchaseFormStore = create((set, get) => ({
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

  resetForm: () =>
    set({ formData: { ...EMPTY_FORM }, returnPath: null }),
}));