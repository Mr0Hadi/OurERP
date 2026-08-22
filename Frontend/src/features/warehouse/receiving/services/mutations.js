import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { confirmReceiving, confirmReturnIntake } from "./api-mockData";
import { incomingQueueKeys } from "./queryKeys";
import { invalidatePurchaseEcosystem } from "@/features/purchases/orders/services/sharedInvalidation";
import { invalidateSalesEcosystem } from "@/features/sales/orders/services/sharedInvalidation";
import { salesReturnKeys } from "@/features/sales/returns/services/queryKeys";

export const useConfirmReceivingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ purchaseId, receivingData }) =>
      confirmReceiving(purchaseId, receivingData),
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
    mutationFn: ({ returnId, intakeData }) =>
      confirmReturnIntake(returnId, intakeData),
    onSuccess: (updatedReturn) => {
      queryClient.setQueryData(
        salesReturnKeys.detail(updatedReturn.id),
        updatedReturn,
      );
      invalidateSalesEcosystem(queryClient, updatedReturn.saleId);
      queryClient.invalidateQueries({ queryKey: incomingQueueKeys.lists() });
      toast.success("دریافت کالای مرجوعی ثبت شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دریافت مرجوعی");
    },
  });
};
