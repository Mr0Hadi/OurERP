import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { customerKeys } from "@/features/customers/services/queryKeys";
import { installmentKeys } from "@/features/sales/installments/services/queryKeys";
import { shippingKeys } from "@/features/warehouse/shipping/services/queryKeys";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { toPaymentPayload } from "@/shared/domain/payments/paymentRows";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { partialSaveMessage, runDocumentChanges } from "@/shared/services/documentChanges";
import { SALE_PAYMENT_SIDE } from "../domain/salePayments";
import {
  SALE_DOCUMENT_CHANGES_API,
  addSalePayment,
  approveSaleProforma,
  removeSale,
  resolveSaleWarehouseIssue,
} from "./api-v1";
import {
  approveAtWarehouse,
  createProforma,
  ensureProformaPaymentType,
  recordProformaPlan,
  releaseReservation,
  saveProformaInfo,
  settleProforma,
} from "./proformaWorkflow";
import { saleKeys, warehouseIssueKeys } from "./queryKeys";
import { invalidateSalesEcosystem } from "./sharedInvalidation";

/**
 * هوک‌های نوشتنِ فروش: هر کدام فقط کش و پیام را مدیریت می‌کند؛ زنجیره‌های سرورِ چرخه‌ی پیش‌فاکتور در
 * `proformaWorkflow.js` است.
 */

/**
 * هر نوشتنِ فروش که سندِ کامل برمی‌گرداند: همان در کشِ جزئیات می‌نشیند و بقیه‌ی اکوسیستم باطل می‌شود.
 * صدور، پرداخت و لغو مانده‌ی حسابِ مشتری را هم تکان می‌دهند.
 */
function applySale(queryClient, sale) {
  if (sale?.id != null) queryClient.setQueryData(saleKeys.detail(sale.id), sale);
  invalidateSalesEcosystem(queryClient, sale?.id, { freshSale: true });
  queryClient.invalidateQueries({ queryKey: customerKeys.all });
}

/**
 * پس از صدورِ فاکتور از پیش‌فاکتور (دریافت، قرارداد، تحویلِ حضوری): پاسخ همیشه سندِ کامل نیست، پس همه‌چیزِ
 * مربوط باطل می‌شود — فروش، مانده‌ی مشتری، اقساط و صفِ ارسال.
 */
function refreshIssuedSale(queryClient, saleId) {
  invalidateSalesEcosystem(queryClient, saleId);
  queryClient.invalidateQueries({ queryKey: customerKeys.all });
  queryClient.invalidateQueries({ queryKey: installmentKeys.all });
  queryClient.invalidateQueries({ queryKey: shippingKeys.all });
}

/**
 * ثبتِ پیش‌فاکتورِ تازه (`createProforma`): `{ payload, send, scannedBarcodes }`.
 * @returns `{ id, stage }`؛ خطای پس از ثبت `partiallySaved` و `saleId` دارد.
 */
export const useCreateSaleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, send, scannedBarcodes }) => createProforma(payload, { send, scannedBarcodes }),
    onSuccess: (result) => {
      toast.success(
        result.stage === SaleProformaStageEnum.WAREHOUSE_CHECKED
          ? "پیش‌فاکتور ثبت و کالا رزرو شد؛ آماده‌ی پرداخت است"
          : result.stage === SaleProformaStageEnum.CUSTOMER_APPROVED
            ? "پیش‌فاکتور ثبت شد و به انبار رفت"
            : "پیش‌فاکتور فروش ثبت شد",
      );
      invalidateSalesEcosystem(queryClient, result.id);
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error) => {
      if (error?.partiallySaved) invalidateSalesEcosystem(queryClient, error.saleId);
      const reason = getErrorMessage(error, "ثبت فروش انجام نشد");
      toast.error(
        error?.partiallySaved ? `${reason} — پیش‌فاکتور ذخیره شد؛ کار را از صفحه‌ی خودش ادامه دهید.` : reason,
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

/** تأییدِ انبار با تغییرِ اختیاریِ اقلام (`approveAtWarehouse`): `{ sale, quantities, scans, issues, reason }`. */
export const useWarehouseApproveMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sale, ...input }) => approveAtWarehouse(sale, input),
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

/** آزادکردنِ دستیِ رزروِ پیش‌فاکتور (`releaseReservation`). `sale` — سندِ کامل. */
export const useReleaseReservationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: releaseReservation,
    onSuccess: (sale) => {
      applySale(queryClient, sale);
      toast.success("رزرو آزاد شد؛ پیش‌فاکتور به پیش‌نویس برگشت");
    },
    onError: (error, sale) => {
      invalidateSalesEcosystem(queryClient, sale.id);
      toast.error(getErrorMessage(error, "آزادکردنِ رزرو انجام نشد"));
    },
  });
};

/**
 * گامِ دریافتِ پیش‌فاکتور (`settleProforma`): شیوه‌ی پرداخت، تغییرهای بی‌اثر، و دریافت/قرارداد/تحویلِ حضوری
 * — فاکتور صادر می‌شود. ورودی همان `settleProforma` است.
 */
export const useSettleProformaMutation = (sale) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => settleProforma(sale, input),
    onSuccess: (result, { plan, deliver }) => {
      refreshIssuedSale(queryClient, sale.id);
      const number = result?.invoiceNumber ? ` ${result.invoiceNumber}` : "";
      toast.success(
        deliver
          ? `فاکتور${number} صادر و کالا تحویل شد`
          : plan
            ? `فاکتور${number} صادر و قرارداد اقساط ثبت شد`
            : `فاکتور${number} صادر شد`,
      );
    },
    onError: (error) => {
      invalidateSalesEcosystem(queryClient, sale.id);
      toast.error(partialSaveMessage(error, getErrorMessage(error, "ثبتِ دریافت انجام نشد")));
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

/** فقط پیش‌فاکتور؛ رفتن به فهرست با خودِ صفحه است. */
export const useRemoveSaleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeSale,
    onSuccess: (removed, id) => {
      queryClient.removeQueries({ queryKey: saleKeys.detail(removed?.id ?? id) });
      invalidateSalesEcosystem(queryClient, null);
      toast.success("پیش‌فاکتور فروش حذف شد");
    },
    onError: (error) => toast.error(getErrorMessage(error, "حذف پیش‌فاکتور فروش انجام نشد")),
  });
};

/**
 * «ثبت تغییرات»ِ صفحه‌ی فروش (پیش‌فاکتور یا صادرشده): سند، دریافت‌ها، سررسید، پیوست‌ها و وضعیت با یک دکمه و
 * یک پیام (`runDocumentChanges`).
 */
export const useSaleChangesSaver = (saleId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes) => runDocumentChanges(SALE_DOCUMENT_CHANGES_API, saleId, changes),
    onSuccess: (latest) => {
      if (latest) applySale(queryClient, latest);
      toast.success(latest?.invoiceNumber ? `فاکتور ${latest.invoiceNumber} ذخیره شد` : "تغییرات فروش ذخیره شد");
    },
    onError: (error) => {
      invalidateSalesEcosystem(queryClient, saleId);
      toast.error(partialSaveMessage(error, getErrorMessage(error, "ذخیره‌ی تغییرات انجام نشد")));
    },
  });
};

/**
 * کارهای سرورِ «دریافت با کارتخوان». برخلافِ بقیه‌ی دریافت‌ها همان لحظه روی سرور می‌نشیند، نه در پیش‌نویسِ
 * صفحه، چون کارت‌کشیدن برگشت‌ناپذیر است.
 *
 * هیچ‌کدام کش را عوض نمی‌کنند: کش که عوض شود صفحه از نو پر می‌شود (یا به فاکتورِ صادرشده می‌رود) و پنلِ
 * کارتخوان وسطِ کار از بین می‌رود. صفحه پس از «بستن»ِ رسید `apply` یا `refresh` را صدا می‌زند.
 *
 *  - `prepare(sale, { paymentType, info })`: پیش از کارت — شیوه‌ی پرداخت و تغییرهای بی‌اثر؛ خطا پیام می‌دهد و
 *    کارت نمی‌خورد.
 *  - `recordPayment`: `AddSalePayment`ِ معمولی (انتقال بانکی، `transferRef` = شماره‌ی پیگیری). کلیدِ
 *    ایدمپوتنسی از دستگاه و شماره‌ی پیگیری است تا «ثبتِ دوباره» ردیفِ دوم نسازد؛ بی شماره‌ی پیگیری، شناسه‌ی
 *    همین ارسال (`reference`) — کلیدِ `pos-1-undefined` همه‌ی چنین پرداخت‌هایی را یکی می‌کرد.
 *  - `recordPlan`: قرارداد با پیش‌پرداختِ کارتخوان (`recordProformaPlan`).
 *  - `apply(sale)`: سندِ کاملِ برگشتی در کش؛ `refresh(saleId)`: باطل‌کردنِ همه‌چیزِ فروشِ صادرشده.
 */
export const useSalePosActions = () => {
  const queryClient = useQueryClient();
  return {
    prepare: async (sale, { paymentType, info }) => {
      try {
        await ensureProformaPaymentType(sale, paymentType);
        await saveProformaInfo(sale.id, info);
      } catch (error) {
        toast.error(getErrorMessage(error, "آماده‌سازیِ پیش‌فاکتور انجام نشد"));
        throw error;
      }
    },
    recordPayment: (saleId, { terminal, row, reference }) =>
      addSalePayment(
        { saleId, ...toPaymentPayload({ ...row, direction: SALE_PAYMENT_SIDE.direction }) },
        { idempotencyKey: `pos-${terminal.id}-${row.transferRef || reference}` },
      ),
    recordPlan: (saleId, plan, options) => recordProformaPlan(saleId, plan, options),
    apply: (sale) => applySale(queryClient, sale),
    refresh: (saleId) => refreshIssuedSale(queryClient, saleId),
  };
};
