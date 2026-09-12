import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { shipSale } from "./api-v1";
import { shippingKeys } from "./queryKeys";
import { invalidateSalesEcosystem } from "@/features/sales/orders/services/sharedInvalidation";
import { idempotencyKeyFor } from "@/shared/services/api/contract";

/**
 * ثبتِ یک دورِ ارسال. پاسخِ بکند `{saleId, saleStatus}` است — خودِ سند
 * برنمی‌گردد، پس کش باطل می‌شود نه اینکه دستی ست شود.
 *
 * عودتِ کالا به تامین‌کننده اینجا نیست: آن یک دورِ اثرِ `GOODS_OUT` روی
 * مرجوعیِ خرید است و از
 * `features/purchases/returns/services/mutations` (`useExecuteGoodsRoundMutation`)
 * می‌آید.
 */
export const useShipSaleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // قرینه‌ی سمتِ دریافت: ارسال هم تجمعی است و تکرارِ درخواست موجودی را
    // دوبار کم می‌کند.
    mutationFn: (command) =>
      shipSale(command, { idempotencyKey: idempotencyKeyFor(command) }),
    onSuccess: (result, command) => {
      const saleId = result?.saleId ?? command.saleId;
      invalidateSalesEcosystem(queryClient, saleId);
      queryClient.invalidateQueries({ queryKey: shippingKeys.all });
      toast.success("ارسال کالا با موفقیت ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت ارسال"),
  });
};
