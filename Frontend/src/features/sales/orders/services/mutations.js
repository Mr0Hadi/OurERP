import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  createSale,
  createInPersonSale,
  updateSale,
  changeSaleStatus,
  updateSaleAttachments,
  updateSalePaymentDate,
  addSalePayment,
  editSalePayment,
  voidSalePayment,
  removeSale,
} from "./api-v1";
import { saleKeys } from "./queryKeys";
import { invalidateSalesEcosystem } from "./sharedInvalidation";
import { partialSaveMessage, runDocumentChanges } from "@/shared/services/documentChanges";
import { shippingKeys } from "@/features/warehouse/shipping/services/queryKeys";
import { customerKeys } from "@/features/customers/services/queryKeys";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { SALE_PAYMENT_SIDE } from "../domain/salePayments";
import { toPaymentPayload } from "@/shared/domain/payments/paymentRows";
import { getErrorMessage } from "@/shared/lib/errorMessage";
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

export const useCreateSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // retry بدون کلید یعنی فاکتورِ تکراری و پرداختِ دوبار ثبت‌شده.
    mutationFn: (payload) =>
      createSale(payload, { idempotencyKey: idempotencyKeyFor(payload) }),
    onSuccess: (created) => {
      toast.success(
        created?.invoiceNumber
          ? `فاکتور ${created.invoiceNumber} صادر شد`
          : "پیش‌فاکتور فروش ثبت شد",
      );
      invalidateSalesEcosystem(queryClient, created?.id ?? null);
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'ثبت فروش انجام نشد'));
    },
  });
};

/**
 * فروشِ حضوری: یک درخواستِ اتمی که ثبت، خروجِ کالا و «تحویل کامل» را انجام می‌دهد.
 * `variables.installmentPlan` برای فروشِ حضوریِ اقساطی (همان تراکنش).
 */
export const useCreateInPersonSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables) =>
      createInPersonSale(variables.payload, variables.scannedBarcodes, {
        idempotencyKey: idempotencyKeyFor(variables),
        installmentPlan: variables.installmentPlan,
      }),
    onSuccess: (created, variables) => {
      toast.success('فروش حضوری ثبت و تحویل شد');
      invalidateSalesEcosystem(queryClient, created.id);
      queryClient.invalidateQueries({ queryKey: shippingKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      if (variables.installmentPlan) {
        queryClient.invalidateQueries({ queryKey: installmentKeys.all });
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'ثبت فروش حضوری انجام نشد'));
    },
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
 * فروشِ اقساطیِ تازه (غیرحضوری). بکند دو قدمِ جدا دارد و دستورِ اتمی‌ای برایشان نیست
 * (`frontend-requests.fa.md` بخش ۱۷): فروش به‌شکلِ پیش‌فاکتورِ اقساطی ثبت می‌شود و
 * بعد قرارداد با پیش‌پرداخت، که فاکتور را صادر می‌کند.
 *
 * `{ payload, plan }` — `plan` بدنه‌ی `CreateSaleInstallmentPlan` بی `saleId`.
 * @returns سندِ کاملِ قرارداد
 */
export const useCreateInstallmentSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload, plan }) => {
      const created = await createSale(payload, { idempotencyKey: idempotencyKeyFor(payload) });
      return createPlanForSale(created.id, plan);
    },
    onSuccess: (plan) => {
      toast.success(`فاکتور ${plan.invoiceNumber || ""} صادر و قرارداد اقساط ثبت شد`);
      applyInstallmentPlan(queryClient, plan);
      invalidateSalesEcosystem(queryClient, plan.saleId);
    },
    onError: (error) => {
      if (error?.partiallySaved) invalidateSalesEcosystem(queryClient, error.saleId);
      toast.error(installmentSaleError(error, "ثبت فروش اقساطی انجام نشد"));
    },
  });
};

/**
 * صدورِ پیش‌فاکتورِ اقساطی: ذخیره‌ی خودِ پیش‌فاکتور (`UpdateSale`) و بعد ثبتِ قرارداد با
 * پیش‌پرداخت. `{ update, plan }`.
 */
export const useIssueInstallmentSaleMutation = (saleId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ update, plan }) => {
      await updateSale(saleId, update);
      return createPlanForSale(saleId, plan);
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
 *  - `saveProforma`: ذخیره‌ی تغییراتِ پیش‌فاکتور پیش از کارت‌کشیدن.
 *  - `recordPayment`: `AddSalePayment`ِ معمولی (انتقال بانکی، `transferRef` = شماره‌ی پیگیری)؛
 *    کلیدِ ایدمپوتنسی از دستگاه و شماره‌ی پیگیری است تا «ثبتِ دوباره» ردیفِ دوم نسازد. اگر
 *    دستگاه شماره‌ی پیگیری نداد، شناسه‌ی همین ارسال (`reference`) جایش می‌نشیند — کلیدِ
 *    `pos-1-undefined` همه‌ی چنین پرداخت‌هایی را یکی می‌کرد.
 */
export const useSalePosActions = () => {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: ({ saleId, update }) => updateSale(saleId, update),
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
    saveProforma: (saleId, update) => save.mutateAsync({ saleId, update }),
    recordPayment: (saleId, { terminal, row, reference }) =>
      record.mutateAsync({ saleId, terminal, row, reference }),
    apply: (sale) => applySale(queryClient, sale),
  };
};
