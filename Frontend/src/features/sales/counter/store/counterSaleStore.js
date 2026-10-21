import { createDocumentFormStore } from "@/shared/store/createDocumentFormStore";
import { EMPTY_PAYMENT_DRAFT } from "@/shared/domain/payments/paymentRows";

/**
 * فرمِ فروشِ پیشخوان. در store (نه state) تا رفتن به «مشتری/کالای جدید» و برگشتن پاکش نکند
 * (`useDocumentFormDraft`). فقط فروشِ تازه است؛ سندی از سرور در آن پر نمی‌شود.
 */
export const useCounterSaleStore = createDocumentFormStore({
  emptyForm: {
    customerId: "",
    customerName: "",
    description: "",
    items: [],
    paymentDraft: EMPTY_PAYMENT_DRAFT,
    // قیمتِ پیش‌فرضِ اقلامِ تازه — پیشخوان خرده‌فروشی است.
    priceMode: "retail",
  },
  formFromDocument: () => ({}),
});
