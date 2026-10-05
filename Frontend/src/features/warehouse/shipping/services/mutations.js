import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { dispatchShipment } from "./api-v1";
import { shippingKeys } from "./queryKeys";
import { applyShipmentResult } from "../../shared/shipmentCache";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { getErrorMessage } from "@/shared/lib/errorMessage";

/** ثبتِ یک محموله‌ی خروجی (`DispatchShipment`): ارسالِ فروش و دورهای خروجِ مرجوعی. */
export const useDispatchShipmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // ارسال تجمعی است و تکرارِ درخواست موجودی را دوبار کم می‌کند.
    mutationFn: (command) =>
      dispatchShipment(command, { idempotencyKey: idempotencyKeyFor(command) }),
    onSuccess: (result, command) => {
      applyShipmentResult(queryClient, result, command);
      queryClient.invalidateQueries({ queryKey: shippingKeys.all });
      toast.success("ارسالِ کالا ثبت شد");
    },
    onError: (error) => toast.error(getErrorMessage(error, "ثبتِ ارسال انجام نشد")),
  });
};
