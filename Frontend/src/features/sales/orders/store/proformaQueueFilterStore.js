import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * فیلترهای یک صفِ پیش‌فاکتور (انبار، صندوق) — نام‌ها همان پارامترهای `GetSaleListQuery`. هر صف store
 * خودش را می‌سازد تا فیلترهایشان قاطی نشود. پیش‌فاکتور شماره و تاریخِ فاکتور ندارد، پس جست‌وجو با نامِ
 * مشتری و بازه با سررسیدِ پرداخت است.
 */
export function createProformaQueueFilterStore() {
  return createFilterStore({
    filters: {
      customerName: "",
      customerId: "",
      paymentType: "",
      fromPaymentDate: "",
      toPaymentDate: "",
    },
  });
}
