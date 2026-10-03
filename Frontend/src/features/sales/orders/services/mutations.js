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
import { runDocumentChanges } from "@/shared/services/documentChanges";
import { shippingKeys } from "@/features/warehouse/shipping/services/queryKeys";
import { customerKeys } from "@/features/customers/services/queryKeys";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { getErrorMessage } from "@/shared/lib/errorMessage";

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
      toast.error(getErrorMessage(error, 'خطا در ثبت فروش'));
    },
  });
};

/** فروشِ حضوری: یک درخواستِ اتمی که ثبت، خروجِ کالا و «تحویل کامل» را انجام می‌دهد. */
export const useCreateInPersonSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables) =>
      createInPersonSale(variables.payload, variables.scannedBarcodes, {
        idempotencyKey: idempotencyKeyFor(variables),
      }),
    onSuccess: (created) => {
      toast.success('فروش حضوری ثبت و تحویل شد');
      invalidateSalesEcosystem(queryClient, created.id);
      queryClient.invalidateQueries({ queryKey: shippingKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'خطا در ثبت فروش حضوری'));
    },
  });
};

/** فقط پیش‌فاکتور. */
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
      toast.error(getErrorMessage(error, "خطا در حذف فروش"));
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
      toast.error(getErrorMessage(error, "ذخیره‌ی تغییرات ناتمام ماند"));
    },
  });
};
