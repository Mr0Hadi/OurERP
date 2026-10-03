import { create } from "zustand";

/**
 * storeِ فرمِ سندِ خرید/فروش (ثبتِ تازه و ویرایشِ پیش‌فاکتور). پیش‌نویس در
 * store است نه state کامپوننت، تا رفتن به «کالا/طرف‌حسابِ جدید» و برگشتن پاکش
 * نکند (`useDocumentFormDraft`).
 *
 * `initializedForId` می‌گوید فرم از کدام نسخه پر شده: `"new"` یا
 * `"id:updatedAt"`؛ فرم فقط وقتی از سرور پر می‌شود که سند یا نسخه‌اش عوض شود.
 *
 * @param emptyForm         فیلدهای فرمِ خالی
 * @param formFromDocument  سند (پاسخِ سرور) → فیلدهای فرم
 */
export function createDocumentFormStore({ emptyForm, formFromDocument }) {
  return create((set, get) => ({
    formData: { ...emptyForm },
    initializedForId: null,

    setFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),

    setItems: (items) => set((state) => ({ formData: { ...state.formData, items } })),

    /** مثلِ `setState`: مقدار یا تابعِ به‌روزرسان (`usePaymentDraft`). */
    setPaymentDraft: (next) =>
      set((state) => ({
        formData: {
          ...state.formData,
          paymentDraft: typeof next === "function" ? next(state.formData.paymentDraft) : next,
        },
      })),

    initializeForNew: () => {
      if (get().initializedForId === "new") return;
      set({ initializedForId: "new", formData: { ...emptyForm } });
    },

    initializeFrom: (doc) => {
      const version = `${doc.id}:${doc.updatedAt}`;
      if (get().initializedForId === version) return;
      set({ initializedForId: version, formData: { ...emptyForm, ...formFromDocument(doc) } });
    },

    resetForm: () => set({ formData: { ...emptyForm }, initializedForId: null }),
  }));
}
