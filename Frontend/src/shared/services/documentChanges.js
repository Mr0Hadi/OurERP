import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { toPaymentPayload } from "@/shared/domain/payments/paymentRows";

/**
 * اعمالِ «ثبت تغییرات»ِ یک سندِ خرید/فروش — همه‌ی تغییرهایی که کاربر روی
 * صفحه جمع کرده، با یک دکمه.
 *
 * بکند برای هر بخش endpointِ جدا دارد؛ این‌جا به ترتیبِ امن صدا زده می‌شوند:
 *
 *   ۱. خودِ سند (`Update*` — فقط پیش‌فاکتور؛ صدورِ خرید هم با همین است)
 *   ۲. پرداخت‌ها (ابطال ← اصلاح ← ثبت؛ اولین دریافتِ فروش فاکتور را صادر می‌کند)
 *   ۳. سررسید
 *   ۴. پیوست‌ها
 *   ۵. وضعیت (آخر از همه؛ لغو بعد از هر چیزِ دیگر)
 *
 * هر عملیاتِ پرداختِ موفق همان لحظه از پیش‌نویس برداشته می‌شود؛ اگر وسطِ کار
 * خطایی رخ دهد، بقیه در انتظار می‌مانند و کاربر می‌تواند دوباره ذخیره کند.
 *
 * @param api  `{ idField, update, addPayment, editPayment, voidPayment, paymentDate, attachments, status }`
 * @returns آخرین نسخه‌ی سند که سرور برگرداند (یا `null` اگر کاری نبود)
 */
export async function runDocumentChanges(api, documentId, changes) {
  const { update, paymentDraft, paymentDate, attachments, status } = changes;
  let latest = null;

  if (update) latest = await api.update(documentId, update);

  for (const operation of paymentDraft?.operations ?? []) {
    if (operation.kind === "void") {
      latest = await api.voidPayment(operation.paymentId);
    } else if (operation.kind === "edit") {
      const payload = {
        ...toPaymentPayload(operation.values, { withDirection: false }),
        paymentId: operation.paymentId,
      };
      latest = await api.editPayment(payload, { idempotencyKey: idempotencyKeyFor(payload) });
    } else {
      const payload = { ...toPaymentPayload(operation.values), [api.idField]: documentId };
      latest = await api.addPayment(payload, { idempotencyKey: idempotencyKeyFor(payload) });
    }
    paymentDraft.settle(operation);
  }

  if (paymentDate !== undefined) latest = await api.paymentDate(documentId, paymentDate);
  if (attachments) latest = await api.attachments(documentId, attachments);
  if (status != null) latest = await api.status(documentId, status);

  return latest;
}
