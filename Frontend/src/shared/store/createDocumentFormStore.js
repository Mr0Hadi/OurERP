import { create } from "zustand";

/**
 * storeِ فرمِ سندِ خرید/فروش (ثبتِ تازه و ویرایشِ پیش‌فاکتور). پیش‌نویس در
 * store است نه state کامپوننت، تا رفتن به «کالا/طرف‌حسابِ جدید» و برگشتن پاکش
 * نکند (`useDocumentFormDraft`).
 *
 * `initializedForId` می‌گوید فرم از کدام نسخه پر شده: `"new"` یا
 * `"id:updatedAt"`؛ فرم فقط وقتی از سرور پر می‌شود که سند یا نسخه‌اش عوض شود.
 *
 * `baseline` فرم در لحظه‌ی پر شدن است؛ `isDocumentFormChanged` با آن می‌سنجد کاربر
 * چیزی ذخیره‌نشده دارد یا نه (بروزرسانیِ برنامه به آن نگاه می‌کند).
 *
 * @param emptyForm         فیلدهای فرمِ خالی
 * @param formFromDocument  سند (پاسخِ سرور) → فیلدهای فرم
 */
export function createDocumentFormStore({ emptyForm, formFromDocument }) {
  return create((set, get) => ({
    formData: { ...emptyForm },
    baseline: emptyForm,
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
      set({ initializedForId: "new", formData: { ...emptyForm }, baseline: emptyForm });
    },

    initializeFrom: (doc) => {
      const version = `${doc.id}:${doc.updatedAt}`;
      if (get().initializedForId === version) return;
      const formData = { ...emptyForm, ...formFromDocument(doc) };
      set({ initializedForId: version, formData, baseline: formData });
    },

    resetForm: () => set({ formData: { ...emptyForm }, baseline: emptyForm, initializedForId: null }),
  }));
}

/** سلکتور: فرم از لحظه‌ی پر شدن تغییر کرده؟ (`useXFormStore(isDocumentFormChanged)`) */
export const isDocumentFormChanged = (state) =>
  state.formData !== state.baseline && JSON.stringify(state.formData) !== JSON.stringify(state.baseline);
