import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { receiveShipment } from "./api-v1";
import { receivingKeys } from "./queryKeys";
import { applyShipmentResult } from "../../shared/shipmentCache";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { getErrorMessage } from "@/shared/lib/errorMessage";

/** ثبتِ یک محموله‌ی ورودی (`ReceiveShipment`): دریافتِ خرید و دورهای ورودِ مرجوعی. */
export const useReceiveShipmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // دریافت تجمعی است: بدون کلید ایدمپوتنسی، یک retry شبکه‌ای همان
    // محموله را دوبار وارد انبار می‌کند.
    mutationFn: (command) =>
      receiveShipment(command, { idempotencyKey: idempotencyKeyFor(command) }),
    onSuccess: (result, command) => {
      applyShipmentResult(queryClient, result, command);
      queryClient.invalidateQueries({ queryKey: receivingKeys.all });
      toast.success("دریافتِ کالا ثبت شد");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "ثبتِ دریافت انجام نشد"));
    },
  });
};
