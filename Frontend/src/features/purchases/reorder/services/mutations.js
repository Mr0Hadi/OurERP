import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { getErrorMessage } from "@/shared/lib/errorMessage";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { invalidatePurchaseEcosystem } from "../../orders/services/sharedInvalidation";
import { createPurchaseDraftsFromReorder } from "./api-v1";
import { reorderKeys } from "./queryKeys";

/**
 * ساختِ پیش‌فاکتورهای خرید از ردیف‌های انتخاب‌شده. پیش‌فاکتورِ تازه «در راه» حساب می‌شود،
 * پس همان کالاها از فهرستِ پیشنهاد بیرون می‌روند.
 */
export function useCreatePurchaseDraftsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      createPurchaseDraftsFromReorder(body, {
        idempotencyKey: idempotencyKeyFor(body, "reorder-drafts"),
      }),
    onSuccess: () => {
      invalidatePurchaseEcosystem(queryClient);
      queryClient.invalidateQueries({ queryKey: reorderKeys.all });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "ساختِ پیش‌فاکتورهای خرید انجام نشد")),
  });
}
