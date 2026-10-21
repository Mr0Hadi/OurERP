import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  approveSaleProforma,
  checkSaleWarehouse,
  completeInPersonSale,
  createSale,
  resolveSaleWarehouseIssue,
  updateSale,
  changeSaleStatus,
  updateSaleAttachments,
  updateSalePaymentDate,
  addSalePayment,
  editSalePayment,
  voidSalePayment,
  removeSale,
} from "./api-v1";
import { saleKeys, warehouseIssueKeys } from "./queryKeys";
import { invalidateSalesEcosystem } from "./sharedInvalidation";
import { partialSaveMessage, runDocumentChanges } from "@/shared/services/documentChanges";
import { shippingKeys } from "@/features/warehouse/shipping/services/queryKeys";
import { customerKeys } from "@/features/customers/services/queryKeys";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { SALE_PAYMENT_SIDE } from "../domain/salePayments";
import { toPaymentPayload } from "@/shared/domain/payments/paymentRows";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { SaleProformaEventEnum, SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { createInstallmentPlan } from "@/features/sales/installments/services/api-v1";
import { installmentKeys } from "@/features/sales/installments/services/queryKeys";
import { applyInstallmentPlan } from "@/features/sales/installments/services/mutations";

/**
 * هر نوشتنِ فروش (به‌جز Create) سندِ کامل را برمی‌گرداند: همان در کشِ
 * جزئیات می‌نشیند و بقیه‌ی اکوسیستم باطل می‌شود. صدور، پرداخت و لغو
 * مانده‌ی حسابِ مشتری را هم تکان می‌دهند.
 */
function applySale(queryClient, sale) {
  if (sale?.id != null) {
    queryClient.setQueryData(saleKeys.detail(sale.id), sale);
  }
  invalidateSalesEcosystem(queryClient, sale?.id, { freshSale: true });
  queryClient.invalidateQueries({ queryKey: customerKeys.all });
}

/**
 * «تحویل کامل» (فقط از «ارسال شده»): مشتری کالا را تحویل گرفته. دکمه‌ی خودش را
 * دارد چون کارِ جدایی است؛ بقیه‌ی تغییرهای فروشِ صادرشده با «ثبت تغییرات» می‌روند.
 */
export const useMarkSaleDeliveredMutation = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => changeSaleStatus(id, SaleStatusEnum.DELIVERED),
    onSuccess: (updated) => {
      applySale(queryClient, updated);
      toast.success("تحویل کامل ثبت شد");
    },
    onError: (error) => toast.error(getErrorMessage(error, "ثبتِ تحویل انجام نشد")),
  });
};

/**
 * ثبتِ پیش‌فاکتورِ تازه پس از تأییدِ مشتری، و (با `send`) فرستادنش به انبار در همان قدم:
 * `CreateSale` ← `ApproveSaleProforma` (نسخه‌ی ۰). پیش‌نویسِ پیش از تأیید چاپی است و ذخیره نمی‌شود
 * («لیست قیمت‌ها»، `PriceListPrint`). اگر قدمِ دوم شکست بخورد، پیش‌فاکتور ذخیره مانده (`partiallySaved`، `saleId`)
 * و صفحه‌اش باز می‌شود تا «ارسال به انبار» از همان‌جا زده شود.
 *
 * `{ payload, send }` — `send`: کاربر `SaleUpdate` دارد (تأییدِ مشتری با همان دسترسی است).
 * @returns `{ id }`
 */
export const useCreateSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload, send }) => {
      // retry بدون کلید یعنی پیش‌فاکتورِ تکراری.
      const created = await createSale(payload, { idempotencyKey: idempotencyKeyFor(payload) });
      if (!send) return { id: created.id, sent: false };
      try {
        await approveSaleProforma(created.id, 0);
      } catch (error) {
        error.partiallySaved = true;
        error.saleId = created.id;
        throw error;
      }
      return { id: created.id, sent: true };
    },
    onSuccess: (result) => {
      toast.success(result.sent ? "پیش‌فاکتور ثبت شد و به انبار رفت" : "پیش‌فاکتور فروش ثبت شد");
      invalidateSalesEcosystem(queryClient, result.id);
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error) => {
      if (error?.partiallySaved) invalidateSalesEcosystem(queryClient, error.saleId);
      const reason = getErrorMessage(error, "ثبت فروش انجام نشد");
      toast.error(
        error?.partiallySaved ? `${reason} — پیش‌فاکتور ذخیره شد ولی به انبار نرفت؛ از صفحه‌اش دوباره بفرستید.` : reason,
      );
    },
  });
};

/**
 * بارکدهای اسکن‌شده‌ی فرم (`{ [productId]: string[] }`) → `lines`ِ `CheckSaleWarehouse`.
 * اگر یک کالا در چند ردیف آمده، دانه‌ها به ترتیب بینِ ردیف‌ها پخش می‌شوند.
 */
function warehouseLinesFrom(sale, scannedBarcodes) {
  const left = Object.fromEntries(
    Object.entries(scannedBarcodes).map(([productId, codes]) => [productId, [...codes]]),
  );
  return (sale.items || []).map((item) => {
    const need = (Number(item.quantity) || 0) - (Number(item.reservedQuantity) || 0);
    const pool = left[item.productId] || [];
    return { saleItemId: item.id, productUnitBarcodes: pool.splice(0, Math.max(need, 0)) };
  });
}

/** پیامِ کسریِ انبار از آخرین رویدادِ `WAREHOUSE_SHORTAGE`. */
function shortageNote(sale) {
  const event = [...(sale.proformaEvents || [])]
    .reverse()
    .find((e) => e.kind === SaleProformaEventEnum.WAREHOUSE_SHORTAGE);
  return event?.note || "همه‌ی دانه‌ها رزرو نشد";
}

/**
 * فروشِ حضوری: یک نفر در پیشخوان همه‌ی چرخه را پشتِ هم انجام می‌دهد — ثبتِ پیش‌فاکتور،
 * تأییدِ مشتری، بررسیِ انبار با همان دانه‌هایی که در فرم اسکن شده‌اند (رزرو)، و
 * `CompleteInPersonSale` (پرداخت یا قرارداد، ارسال و تحویل، اتمیک).
 *
 * چهار درخواستِ جداست و دستورِ اتمیِ یک‌جا ندارد. اگر بعد از ثبت قدمی شکست بخورد، پیش‌فاکتور
 * می‌ماند: `partiallySaved` و `saleId` روی خطا می‌نشینند تا صفحه به همان پیش‌فاکتور برود و
 * کار از همان مرحله ادامه یابد.
 *
 * `deliver = false` (فقط کارتخوانی که کمتر از کلِ مبلغ کشیده شد — پولِ گرفته‌شده نباید گم شود):
 * به‌جای `CompleteInPersonSale` دریافت‌ها با `AddSalePayment` ثبت می‌شوند؛ فاکتور صادر و دانه‌ها
 * رزرو می‌مانند تا انبار ارسال کند.
 *
 * `{ payload, scannedBarcodes, paymentRows, installmentPlan, deliver }`
 * @returns `{ id, invoiceNumber, status }`
 */
export const useInPersonSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload, scannedBarcodes, paymentRows = [], installmentPlan = null, deliver = true }) => {
      const created = await createSale(payload, { idempotencyKey: idempotencyKeyFor(payload) });
      try {
        const approved = await approveSaleProforma(created.id, 0);
        let ready = approved;
        if (approved.proformaStage !== SaleProformaStageEnum.WAREHOUSE_CHECKED) {
          ready = await checkSaleWarehouse({
            saleId: created.id,
            revision: approved.revision,
            lines: warehouseLinesFrom(approved, scannedBarcodes),
          });
        }
        if (ready.proformaStage !== SaleProformaStageEnum.WAREHOUSE_CHECKED) {
          throw new Error(`کسری در انبار: ${shortageNote(ready)}`);
        }
        if (!deliver) {
          let latest = ready;
          for (const row of paymentRows) {
            const body = { saleId: created.id, ...toPaymentPayload({ ...row, direction: SALE_PAYMENT_SIDE.direction }) };
            latest = await addSalePayment(body, { idempotencyKey: idempotencyKeyFor(body) });
          }
          return latest;
        }
        const body = { saleId: created.id, paymentRows, installmentPlan };
        return await completeInPersonSale(body, { idempotencyKey: idempotencyKeyFor(body) });
      } catch (error) {
        error.partiallySaved = true;
        error.saleId = created.id;
        throw error;
      }
    },
    onSuccess: (completed, variables) => {
      toast.success(
        variables.deliver === false
          ? `فاکتور ${completed?.invoiceNumber || ""} صادر شد؛ کالا رزرو است و انبار ارسال می‌کند`
          : `فاکتور ${completed?.invoiceNumber || ""} صادر و تحویل شد`,
      );
      invalidateSalesEcosystem(queryClient, completed?.id ?? null);
      queryClient.invalidateQueries({ queryKey: shippingKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      if (variables.installmentPlan) {
        queryClient.invalidateQueries({ queryKey: installmentKeys.all });
      }
    },
    onError: (error) => {
      if (error?.partiallySaved) invalidateSalesEcosystem(queryClient, error.saleId);
      const reason = getErrorMessage(error, "ثبت فروش حضوری انجام نشد");
      toast.error(
        error?.partiallySaved
          ? `${reason} — پیش‌فاکتور ذخیره شد؛ کار را از صفحه‌ی همان پیش‌فاکتور ادامه دهید.`
          : reason,
      );
    },
  });
};

/** «مشتری تأیید کرد». `{ saleId, revision }`. */
export const useApproveSaleProformaMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, revision }) => approveSaleProforma(saleId, revision),
    onSuccess: (sale) => {
      applySale(queryClient, sale);
      toast.success(
        sale.proformaStage === SaleProformaStageEnum.WAREHOUSE_CHECKED
          ? "تأیید مشتری ثبت شد؛ کالا هنوز رزرو است و پیش‌فاکتور آماده‌ی پرداخت است"
          : "تأیید مشتری ثبت شد و پیش‌فاکتور به صفِ انبار رفت",
      );
    },
    onError: (error, { saleId }) => {
      invalidateSalesEcosystem(queryClient, saleId);
      toast.error(getErrorMessage(error, "ثبتِ تأیید مشتری انجام نشد"));
    },
  });
};

/**
 * تأییدِ انبار، با تغییرِ اختیاریِ اقلام. بی‌تغییر: یک `CheckSaleWarehouse`. با تغییر (تعدادِ کمتر یا
 * حذفِ ردیف، با دلیل): `UpdateSale` (پیش‌فاکتور به پیش‌نویس) ← `ApproveSaleProforma` (همان تأییدِ
 * مشتری، با نسخه‌ی تازه) ← `CheckSaleWarehouse` با دلیل در `note`، که در تاریخچه‌ی پیش‌فاکتور
 * می‌ماند. اگر تأییدِ دوباره مستقیم «آماده‌ی پرداخت» شود (ردیف‌های مانده رزرو بودند)، بررسی
 * لازم نیست و دلیل فقط در رویدادِ «ویرایش» می‌ماند.
 *
 * TODO(بکند): `frontend-requests.fa.md` بخش ۲۴ — تا `CheckSaleWarehouse` تغییرِ تعداد را بپذیرد،
 * زنجیره `SaleUpdate` هم می‌خواهد و اتمیک نیست.
 *
 * `{ sale, quantities, scans, issues, reason }` — `quantities`: `{ [saleItemId]: number }` فقط
 * ردیف‌های تغییرکرده؛ `scans`: `{ [saleItemId]: string[] }`.
 * @returns سندِ کاملِ فروش (`WAREHOUSE_CHECKED`)
 */
export const useWarehouseApproveMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sale, quantities = {}, scans, issues = [], reason = "" }) => {
      let base = sale;
      if (Object.keys(quantities).length > 0) {
        const items = (sale.items || [])
          .map((item) => ({ ...item, quantity: quantities[item.id] ?? item.quantity }))
          .filter((item) => Number(item.quantity) > 0);
        // همان شرایطِ ذخیره‌شده (مشتری، شیوه‌ی پرداخت، سررسید)؛ فقط تعدادها عوض می‌شوند.
        const updated = await updateSale(sale.id, { ...sale, items });
        try {
          base = await approveSaleProforma(sale.id, updated.revision);
        } catch (error) {
          throw new Error(
            `${getErrorMessage(error, "ثبتِ تأیید انجام نشد")} — اقلامِ پیش‌فاکتور تغییر کرد ولی پیش‌فاکتور به پیش‌نویس برگشت و از صفِ انبار بیرون رفت؛ فروش باید دوباره «ارسال به انبار» بزند.`,
            { cause: error },
          );
        }
      }

      if (base.proformaStage === SaleProformaStageEnum.CUSTOMER_APPROVED) {
        base = await checkSaleWarehouse({
          saleId: sale.id,
          revision: base.revision,
          lines: (base.items || [])
            .map((item) => {
              const need = Math.max(0, Number(item.quantity) - (Number(item.reservedQuantity) || 0));
              return { saleItemId: item.id, productUnitBarcodes: (scans[item.id] || []).slice(0, need) };
            })
            .filter((line) => line.productUnitBarcodes.length > 0),
          issues,
          note: reason || null,
        });
      } else if (issues.length > 0) {
        // تأییدِ دوباره مستقیم «آماده‌ی پرداخت» شد (ردیف‌های مانده از قبل رزرو بودند)؛ بررسی‌ای
        // نمانده که گزارش‌ها همراهش بروند.
        throw new Error(
          "پیش‌فاکتور تغییر کرد و تأیید شد، ولی گزارشِ دانه‌های معیوب/مفقود ثبت نشد؛ آن‌ها را از صفحه‌ی «دانه‌ها و برچسب‌ها» قرنطینه کنید.",
        );
      }

      if (base.proformaStage !== SaleProformaStageEnum.WAREHOUSE_CHECKED) {
        throw new Error(`تأیید انبار ثبت نشد: ${shortageNote(base)}`);
      }
      return base;
    },
    onSuccess: (sale) => {
      applySale(queryClient, sale);
      queryClient.invalidateQueries({ queryKey: warehouseIssueKeys.all });
      toast.success("انبار تأیید کرد؛ کالا رزرو شد و پیش‌فاکتور آماده‌ی پرداخت است");
    },
    onError: (error, { sale }) => {
      invalidateSalesEcosystem(queryClient, sale.id);
      queryClient.invalidateQueries({ queryKey: warehouseIssueKeys.all });
      toast.error(getErrorMessage(error, "ثبتِ تأیید انبار انجام نشد"));
    },
  });
};

/** تصمیمِ حسابداری روی گزارشِ انبار. `{ id, resolution, note }`. */
export const useResolveWarehouseIssueMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveSaleWarehouseIssue,
    onSuccess: (issue) => {
      toast.success("تصمیم ثبت شد");
      queryClient.invalidateQueries({ queryKey: warehouseIssueKeys.all });
      invalidateSalesEcosystem(queryClient, issue?.saleId ?? null);
    },
    onError: (error) => toast.error(getErrorMessage(error, "ثبتِ تصمیم انجام نشد")),
  });
};

/**
 * پیامِ خطای ثبتِ فروشِ اقساطی که فروشش ذخیره شد ولی قراردادش نه (`error.partiallySaved`):
 * فروش پیش‌فاکتورِ اقساطی مانده و قرارداد از صفحه‌ی همان پیش‌فاکتور دوباره ثبت می‌شود.
 */
function installmentSaleError(error, fallback) {
  const reason = getErrorMessage(error, fallback);
  if (!error?.partiallySaved) return reason;
  // بی‌پاسخ (تایم‌اوت، قطعِ شبکه): شاید سرور قرارداد را ثبت کرده باشد. صفحه‌ی فروش وضعیتِ
  // واقعی را نشان می‌دهد؛ ثبتِ دوباره قراردادِ دوم نمی‌سازد (یک قراردادِ جاری برای هر فروش،
  // و همان `Idempotency-Key` برای همان محتوا).
  if (!error.response) {
    return `${reason} — فروش ذخیره شد ولی پاسخِ ثبتِ قرارداد نرسید. در صفحه‌ی فروش ببینید: اگر هنوز پیش‌فاکتور است، قرارداد ثبت نشده و می‌توانید دوباره ثبت کنید.`;
  }
  return `${reason} — فروش به‌صورتِ پیش‌فاکتور ذخیره شد؛ قرارداد اقساط را از صفحه‌ی همان پیش‌فاکتور دوباره ثبت کنید.`;
}

/**
 * ثبتِ قرارداد روی فروشی که همین حالا ذخیره شد. خطا یعنی فروش هست و قرارداد نه؛
 * `partiallySaved` و `saleId` روی خطا می‌نشینند تا صفحه به همان پیش‌فاکتور برود.
 */
async function createPlanForSale(saleId, plan) {
  const body = { saleId, ...plan };
  try {
    return await createInstallmentPlan(body, { idempotencyKey: idempotencyKeyFor(body) });
  } catch (error) {
    error.partiallySaved = true;
    error.saleId = saleId;
    throw error;
  }
}

/**
 * صدورِ پیش‌فاکتورِ اقساطیِ «آماده‌ی پرداخت»: ثبتِ قرارداد با پیش‌پرداخت. فقط تغییرهای بی‌اثر بر
 * چرخه پیش از آن ذخیره می‌شوند. `{ update, attachments, plan, paymentDate }`.
 */
export const useIssueInstallmentSaleMutation = (saleId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ update, attachments, plan, paymentDate }) => {
      // `update` فقط تغییرِ بی‌اثر بر چرخه (تاریخِ فاکتور، توضیح، پیوست‌ها).
      if (update) await updateSale(saleId, update);
      else if (attachments) await updateSaleAttachments(saleId, attachments);
      const created = await createPlanForSale(saleId, plan);
      // مهلتِ پرداخت پس از صدور؛ روی پیش‌فاکتور چرخه را برمی‌گرداند.
      if (paymentDate !== undefined) await updateSalePaymentDate(saleId, paymentDate);
      return created;
    },
    onSuccess: (plan) => {
      toast.success(`فاکتور ${plan.invoiceNumber || ""} صادر و قرارداد اقساط ثبت شد`);
      applyInstallmentPlan(queryClient, plan);
      invalidateSalesEcosystem(queryClient, saleId);
    },
    onError: (error) => {
      invalidateSalesEcosystem(queryClient, saleId);
      toast.error(installmentSaleError(error, "صدورِ فاکتورِ اقساطی انجام نشد"));
    },
  });
};

/** فقط پیش‌فاکتور؛ رفتن به فهرست با خودِ صفحه است. */
export const useRemoveSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeSale,
    onSuccess: (removed, id) => {
      queryClient.removeQueries({
        queryKey: saleKeys.detail(removed?.id ?? id),
      });
      invalidateSalesEcosystem(queryClient, null);
      toast.success("پیش‌فاکتور فروش حذف شد");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "حذف پیش‌فاکتور فروش انجام نشد"));
    },
  });
};

const SALE_CHANGES_API = {
  idField: "saleId",
  update: updateSale,
  addPayment: addSalePayment,
  editPayment: editSalePayment,
  voidPayment: voidSalePayment,
  paymentDate: updateSalePaymentDate,
  attachments: updateSaleAttachments,
  status: changeSaleStatus,
};

/**
 * «ثبت تغییرات»ِ صفحه‌ی فروش (پیش‌فاکتور یا صادرشده): سند، پرداخت‌ها (اولین
 * دریافت فاکتور را صادر می‌کند)، سررسید، پیوست‌ها و وضعیت با یک دکمه و یک پیام
 * (`runDocumentChanges`).
 */
export const useSaleChangesSaver = (saleId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes) => runDocumentChanges(SALE_CHANGES_API, saleId, changes),
    onSuccess: (latest) => {
      if (latest) applySale(queryClient, latest);
      toast.success(
        latest?.invoiceNumber ? `فاکتور ${latest.invoiceNumber} ذخیره شد` : "تغییرات فروش ذخیره شد",
      );
    },
    onError: (error) => {
      invalidateSalesEcosystem(queryClient, saleId);
      toast.error(partialSaveMessage(error, getErrorMessage(error, "ذخیره‌ی تغییرات انجام نشد")));
    },
  });
};

/**
 * کارهای سرورِ «دریافت با کارتخوان» روی فروش. برخلافِ بقیه‌ی دریافت‌ها همان لحظه روی سرور
 * می‌نشیند، نه در پیش‌نویسِ صفحه، چون کارت‌کشیدن برگشت‌ناپذیر است.
 *
 * هیچ‌کدام سندِ برگشتی را در کش نمی‌گذارند: کش که عوض شود فرمِ پیش‌فاکتور از نو پر
 * می‌شود (یا صفحه به فاکتورِ صادرشده می‌رود) و پنلِ کارتخوان وسطِ کار از بین می‌رود. صفحه
 * بعد از «بستن»ِ رسید خودش `apply` را صدا می‌زند.
 *
 *  - `saveInfo`: پیش از کارت‌کشیدن، تغییرهای بی‌اثر بر چرخه‌ی تأیید (`{ update, attachments }`:
 *    توضیح با `UpdateSale`ی که شرایطِ ذخیره‌شده را نگه می‌دارد، یا فقط پیوست‌ها).
 *  - `recordPayment`: `AddSalePayment`ِ معمولی (انتقال بانکی، `transferRef` = شماره‌ی پیگیری)؛
 *    کلیدِ ایدمپوتنسی از دستگاه و شماره‌ی پیگیری است تا «ثبتِ دوباره» ردیفِ دوم نسازد. اگر
 *    دستگاه شماره‌ی پیگیری نداد، شناسه‌ی همین ارسال (`reference`) جایش می‌نشیند — کلیدِ
 *    `pos-1-undefined` همه‌ی چنین پرداخت‌هایی را یکی می‌کرد.
 */
export const useSalePosActions = () => {
  const queryClient = useQueryClient();
  const info = useMutation({
    mutationFn: async ({ saleId, update, attachments }) => {
      if (update) await updateSale(saleId, update);
      else if (attachments) await updateSaleAttachments(saleId, attachments);
    },
    onError: (error) => toast.error(getErrorMessage(error, "ذخیره‌ی پیش‌فاکتور انجام نشد")),
  });
  const record = useMutation({
    mutationFn: ({ saleId, terminal, row, reference }) =>
      addSalePayment(
        { saleId, ...toPaymentPayload({ ...row, direction: SALE_PAYMENT_SIDE.direction }) },
        { idempotencyKey: `pos-${terminal.id}-${row.transferRef || reference}` },
      ),
  });

  return {
    saveInfo: (saleId, { update, attachments } = {}) =>
      update || attachments ? info.mutateAsync({ saleId, update, attachments }) : Promise.resolve(),
    recordPayment: (saleId, { terminal, row, reference }) =>
      record.mutateAsync({ saleId, terminal, row, reference }),
    apply: (sale) => applySale(queryClient, sale),
  };
};
