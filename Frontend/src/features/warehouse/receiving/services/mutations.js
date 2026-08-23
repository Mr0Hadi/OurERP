import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { confirmReceiving, confirmReturnIntake } from "./api";
import { incomingQueueKeys } from "./queryKeys";
import { invalidatePurchaseEcosystem } from "@/features/purchases/orders/services/sharedInvalidation";
import { invalidateSalesEcosystem } from "@/features/sales/orders/services/sharedInvalidation";
import { salesReturnKeys } from "@/features/sales/returns/services/queryKeys";
import { idempotencyKeyFor } from "@/shared/services/api/contract";

export const useConfirmReceivingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // دریافت تجمعی است: هر دور به `receivedQty` و موجودی اضافه می‌کند.
    // بدون کلید ایدمپوتنسی، یک retry شبکه‌ای همان محموله را دوبار
    // وارد انبار می‌کند.
    mutationFn: (variables) =>
      confirmReceiving(variables.purchaseId, variables.receivingData, {
        idempotencyKey: idempotencyKeyFor(variables),
      }),
    onSuccess: (updatedPurchase) => {
      // این دور دریافت ممکن است هم‌زمان چند مرجوعیِ «در انتظار کالای
      // جایگزین» را ببندد و هم وضعیت خودِ خرید را عوض کند، پس از تابع
      // مرکزی استفاده می‌کنیم تا هیچ کشی فراموش نشود.
      invalidatePurchaseEcosystem(queryClient, updatedPurchase.id);
      queryClient.invalidateQueries({ queryKey: incomingQueueKeys.lists() });
      toast.success("دریافت کالا با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دریافت");
    },
  });
};

export const useConfirmReturnIntakeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables) =>
      confirmReturnIntake(variables.returnId, variables.intakeData, {
        idempotencyKey: idempotencyKeyFor(variables),
      }),
    onSuccess: (updatedReturn) => {
      queryClient.setQueryData(
        salesReturnKeys.detail(updatedReturn.id),
        updatedReturn,
      );
      invalidateSalesEcosystem(queryClient, updatedReturn.saleId, {
        freshReturnId: updatedReturn.id,
      });
      queryClient.invalidateQueries({ queryKey: incomingQueueKeys.lists() });
      toast.success("دریافت کالای مرجوعی ثبت شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دریافت مرجوعی");
    },
  });
};
