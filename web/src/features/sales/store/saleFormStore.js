import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useSaleFormStore = create(
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

        set({
          initializedForId: 'new',
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
            items: (sale.items || []).map((item) => ({
              productId: item.productId || '',
              productCode: item.productCode || '',
              productName: item.productName || '',
              unit: item.unit || '',
              qty: item.qty || 1,
              unitPrice: item.unitPrice || 0,
              discount: item.discount || 0,
            })),
          },
        });
      },

      resetForm: () => set({ formData: { ...EMPTY_FORM }, initializedForId: null }),
    }),
    {
      name: 'sale-form-storage',
      partialize: (state) => ({
        formData: state.formData,
        initializedForId: state.initializedForId,
      }),
    }
  )
);