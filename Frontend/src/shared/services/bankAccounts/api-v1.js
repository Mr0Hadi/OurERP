import axiosInstance from "@/shared/services/api/axios";

/**
 * `GET BankAccount/GetBankAccountOptions` — حساب‌های فعال برای انتخابگرِ فرم‌های پرداخت، **بی مانده**:
 * `[{ id, title, kind, bankName }]`. برای هر کسی که پول ثبت می‌کند باز است (`SalePayment`، `PurchasePayment`، …).
 */
export async function fetchBankAccountOptions() {
  const { data } = await axiosInstance.get("/BankAccount/GetBankAccountOptions");
  return data ?? [];
}
