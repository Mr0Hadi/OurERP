import axiosInstance from "@/shared/services/api/axios";
import { idempotent } from "@/shared/services/api/contract";

/**
 * کنترلر `api/BankAccount` (`Backend-Net/docs/api-guide.fa.md`، بخش ۲۳): صندوق‌ها و حساب‌های بانکی، مانده،
 * گردش و انتقال بین حساب‌های خودمان.
 *
 * مانده هیچ‌جا ذخیره نمی‌شود؛ سرور هر بار از روی ردیف‌ها حساب می‌کند (مانده‌ی اول دوره + دریافت‌ها − پرداخت‌ها
 * ± انتقال‌ها) و ممکن است منفی باشد. چک فقط پس از وصول در مانده می‌آید.
 */

/**
 * `GET GetBankAccountList` — بی صفحه‌بندی: `{ accounts[], totalCashBoxBalance, totalBankBalance, totalBalance,
 * unassignedNet }`. `unassignedNet` خالصِ پول‌هایی است که حسابی ندارند (ردیف‌های قدیمی).
 */
export async function fetchBankAccounts({ includeInactive = false } = {}) {
  const { data } = await axiosInstance.get("/BankAccount/GetBankAccountList", {
    params: { includeInactive: includeInactive || undefined },
  });
  return data;
}

/**
 * `GET GetBankAccountStatement` — گردشِ یک حساب، قدیمی‌ترین اول با مانده‌ی جاری؛ بی صفحه‌بندی (با تاریخ محدود
 * می‌شود). `fromDate`/`toDate` هر دو روز شامل‌اند.
 */
export async function fetchBankAccountStatement({ bankAccountId, fromDate, toDate }) {
  const { data } = await axiosInstance.get("/BankAccount/GetBankAccountStatement", {
    params: { bankAccountId, fromDate: fromDate || undefined, toDate: toDate || undefined },
  });
  return data;
}

/** `POST CreateBankAccount` — خروجی حساب با مانده. */
export async function createBankAccount(body) {
  const { data } = await axiosInstance.post("/BankAccount/CreateBankAccount", body);
  return data;
}

/** `PUT UpdateBankAccount` — همان بدنه با `id`. نوعِ حسابی که گردش دارد عوض نمی‌شود. */
export async function updateBankAccount(body) {
  const { data } = await axiosInstance.put("/BankAccount/UpdateBankAccount", body);
  return data;
}

/** `DELETE DeleteBankAccount` — غیرفعال‌سازی؛ گردش می‌ماند. حسابِ کارتخوانِ فعال ۴۰۰. */
export async function deactivateBankAccount(id) {
  const { data } = await axiosInstance.delete("/BankAccount/DeleteBankAccount", { params: { id } });
  return data;
}

/**
 * `POST TransferBetweenAccounts` — جابه‌جاییِ پول بین دو حسابِ خودمان (واریزِ صندوق به بانک، …). پرداخت نیست و
 * حسابِ هیچ شخصی را عوض نمی‌کند. `transferredAt` خالی = اکنون.
 */
export async function transferBetweenAccounts(body, { idempotencyKey } = {}) {
  const { data } = await axiosInstance.post(
    "/BankAccount/TransferBetweenAccounts",
    body,
    idempotent(idempotencyKey),
  );
  return data;
}

/** `POST VoidTransfer` — ابطالِ انتقالِ اشتباه (ویرایش ندارد؛ ابطال و ثبتِ دوباره). */
export async function voidTransfer(id) {
  const { data } = await axiosInstance.post("/BankAccount/VoidTransfer", { id });
  return data;
}
