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
 * اگر وسطِ کار خطا رخ دهد و بخشی پیش از آن ذخیره شده باشد، `error.partiallySaved`
 * روشن می‌شود تا پیام به کاربر بگوید «بخشی ذخیره شد» (`partialSaveMessage`)؛ وگرنه
 * کاربر فکر می‌کند هیچ چیز ثبت نشده و پرداخت را دوباره وارد می‌کند.
 *
 * @param api  `{ idField, update, addPayment, editPayment, voidPayment, paymentDate, attachments, status }`
 * @returns آخرین نسخه‌ی سند که سرور برگرداند (یا `null` اگر کاری نبود)
 */
export async function runDocumentChanges(api, documentId, changes) {
  // آخرین سندی که سرور برگرداند؛ پُر یعنی دست‌کم یک قدم ذخیره شده.
  const progress = { latest: null };
  try {
    await applyChanges(api, documentId, changes, progress);
    return progress.latest;
  } catch (error) {
    error.partiallySaved = progress.latest != null;
    throw error;
  }
}

/**
 * پیامِ خطای «ثبت تغییرات»: اگر بخشی ذخیره شده، همین را صریح می‌گوید.
 *
 * @param reason متنِ خطا (معمولاً `getErrorMessage(error, …)`)
 */
export function partialSaveMessage(error, reason) {
  return error?.partiallySaved
    ? `${reason} — بخشی از تغییرات ذخیره شد؛ آنچه مانده هنوز «ثبت‌نشده» روی صفحه است.`
    : reason;
}

async function applyChanges(api, documentId, changes, progress) {
  const { update, paymentDraft, paymentDate, attachments, status } = changes;
  const saved = (doc) => {
    progress.latest = doc;
  };

  if (update) saved(await api.update(documentId, update));

  for (const operation of paymentDraft?.operations ?? []) {
    if (operation.kind === "void") {
      saved(await api.voidPayment(operation.paymentId));
    } else if (operation.kind === "edit") {
      const payload = {
        ...toPaymentPayload(operation.values, { withDirection: false }),
        paymentId: operation.paymentId,
      };
      saved(await api.editPayment(payload, { idempotencyKey: idempotencyKeyFor(payload) }));
    } else {
      const payload = { ...toPaymentPayload(operation.values), [api.idField]: documentId };
      // دو دریافتِ هم‌مبلغ در یک ذخیره دو قصدِ جدایند؛ شناسه‌ی ردیفِ پیش‌نویس جدایشان می‌کند.
      saved(
        await api.addPayment(payload, {
          idempotencyKey: idempotencyKeyFor(payload, operation.id),
        }),
      );
    }
    paymentDraft.settle(operation);
  }

  if (paymentDate !== undefined) saved(await api.paymentDate(documentId, paymentDate));
  if (attachments) saved(await api.attachments(documentId, attachments));
  if (status != null) saved(await api.status(documentId, status));
}
