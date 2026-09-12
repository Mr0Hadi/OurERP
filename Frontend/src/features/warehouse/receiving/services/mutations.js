import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { receivePurchase } from "./api-v1";
import { receivingKeys } from "./queryKeys";
import { invalidatePurchaseEcosystem } from "@/features/purchases/orders/services/sharedInvalidation";
import { idempotencyKeyFor } from "@/shared/services/api/contract";

/**
 * ثبتِ یک دورِ دریافت. پاسخِ بکند `{purchaseId, purchaseStatus}` است —
 * خودِ سند برنمی‌گردد، پس کش باطل می‌شود نه اینکه دستی ست شود.
 *
 * تحویل‌گرفتنِ کالای برگشتی از مشتری اینجا نیست: آن یک دورِ اثرِ
 * `GOODS_IN` روی مرجوعیِ فروش است و از
 * `features/sales/returns/services/mutations` (`useExecuteGoodsRoundMutation`)
 * می‌آید — همان endpointی که صفحه‌ی مرجوعی هم استفاده می‌کند.
 */
export const useReceivePurchaseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // دریافت تجمعی است: هر دور به `receivedQuantity` و موجودی اضافه می‌کند.
    // بدون کلید ایدمپوتنسی، یک retry شبکه‌ای همان محموله را دوبار
    // وارد انبار می‌کند.
    mutationFn: (command) =>
      receivePurchase(command, { idempotencyKey: idempotencyKeyFor(command) }),
    onSuccess: (result, command) => {
      const purchaseId = result?.purchaseId ?? command.purchaseId;
      invalidatePurchaseEcosystem(queryClient, purchaseId);
      queryClient.invalidateQueries({ queryKey: receivingKeys.all });
      toast.success("دریافت کالا با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دریافت");
    },
  });
};
