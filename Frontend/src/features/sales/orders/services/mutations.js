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
import { shippingKeys } from "@/features/warehouse/shipping/services/queryKeys";
import { customerKeys } from "@/features/customers/services/queryKeys";
import { idempotencyKeyFor } from "@/shared/services/api/contract";

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
      toast.error(error?.message || 'خطا در ثبت فروش');
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
      toast.error(error?.message || 'خطا در ثبت فروش حضوری');
    },
  });
};

/** فقط پیش‌فاکتور. */
export const useUpdateSaleMutation = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (saleData) => updateSale(id, saleData),
    onSuccess: (updated) => {
      applySale(queryClient, updated);
      toast.success("پیش‌فاکتور فروش ویرایش شد");
    },
    onError: (error) => {
      toast.error(error?.message || 'خطا در ویرایش فروش');
    },
  });
};

export const useChangeSaleStatusMutation = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status) => changeSaleStatus(id, status),
    onSuccess: (updated) => {
      // تغییر وضعیت واجدشرایط‌بودنِ فروش برای «ارسال انبار» و «مرجوعی» را هم عوض می‌کند.
      applySale(queryClient, updated);
      toast.success("وضعیت فروش به‌روزرسانی شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در تغییر وضعیت"),
  });
};

export const useUpdateSaleAttachmentsMutation = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachments) => updateSaleAttachments(id, attachments),
    onSuccess: (updated) => {
      applySale(queryClient, updated);
      toast.success("پیوست‌ها ذخیره شد");
    },
    onError: (error) =>
      toast.error(error?.message || "خطا در ذخیره‌ی پیوست‌ها"),
  });
};

export const useUpdateSalePaymentDateMutation = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentDate) => updateSalePaymentDate(id, paymentDate),
    onSuccess: (updated) => {
      applySale(queryClient, updated);
      toast.success("مهلت پرداخت ذخیره شد");
    },
    onError: (error) =>
      toast.error(error?.message || "خطا در ذخیره‌ی مهلت پرداخت"),
  });
};

/**
 * ثبت و اصلاحِ پرداخت تجمعی‌اند، پس کلیدِ ایدمپوتنسی می‌گیرند. اولین
 * پرداخت روی پیش‌فاکتور فاکتور را صادر می‌کند؛ پاسخ همان سندِ صادرشده است.
 */
export const useSalePaymentMutations = (saleId) => {
  const queryClient = useQueryClient();
  const onSuccess = (message) => (updated) => {
    applySale(queryClient, updated);
    toast.success(message);
  };
  const onError = (fallback) => (error) =>
    toast.error(error?.message || fallback);

  const add = useMutation({
    mutationFn: (payment) =>
      addSalePayment(
        { ...payment, saleId },
        { idempotencyKey: idempotencyKeyFor(payment) },
      ),
    onSuccess: onSuccess("پرداخت ثبت شد"),
    onError: onError("خطا در ثبت پرداخت"),
  });

  const edit = useMutation({
    mutationFn: (payment) =>
      editSalePayment(payment, { idempotencyKey: idempotencyKeyFor(payment) }),
    onSuccess: onSuccess("پرداخت اصلاح شد"),
    onError: onError("خطا در اصلاح پرداخت"),
  });

  const voidPayment = useMutation({
    mutationFn: voidSalePayment,
    onSuccess: onSuccess("پرداخت باطل شد"),
    onError: onError("خطا در ابطال پرداخت"),
  });

  return { add, edit, void: voidPayment };
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
      toast.error(error?.message || "خطا در حذف فروش");
    },
  });
};
