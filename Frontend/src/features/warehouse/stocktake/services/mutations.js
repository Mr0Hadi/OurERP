import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { getErrorMessage } from "@/shared/lib/errorMessage";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { productKeys } from "@/features/warehouse/products/services/queryKeys";
import { productUnitKeys } from "@/features/warehouse/units/services/queryKeys";
import {
  changeStocktakeStatus,
  countStocktakeLine,
  createStocktake,
  removeStocktakeScan,
  scanStocktakeUnits,
} from "./api-v1";
import { stocktakeKeys } from "./queryKeys";

/**
 * هر دستور سندِ کامل برمی‌گرداند؛ همان در کشِ جزئیات می‌نشیند و فهرست باطل می‌شود. `affectsStock` فقط برای تأیید:
 * دانه‌ها اسقاط/ساخته/جابه‌جا می‌شوند، پس موجودیِ کالا و دانه‌ها هم تازه می‌شوند (حسابداری با هر ورود از سرور می‌خواند).
 */
function useStocktakeMutation({ mutationFn, success, failure, affectsStock = false }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (stocktake) => {
      if (stocktake?.id != null) queryClient.setQueryData(stocktakeKeys.detail(stocktake.id), stocktake);
      queryClient.invalidateQueries({ queryKey: stocktakeKeys.lists() });
      if (affectsStock) {
        queryClient.invalidateQueries({ queryKey: productKeys.all });
        queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
      }
      if (success) toast.success(success);
    },
    onError: (error) => toast.error(getErrorMessage(error, failure)),
  });
}

export const useCreateStocktakeMutation = () =>
  useStocktakeMutation({
    // دوبارکلیک دو انبارگردانیِ هم‌دامنه می‌سازد (دومی ۴۰۰ می‌گیرد، ولی بهتر است اصلاً فرستاده نشود).
    mutationFn: (body) => createStocktake(body, { idempotencyKey: idempotencyKeyFor(body, "stocktake-create") }),
    success: "انبارگردانی ساخته شد",
    failure: "ساختِ انبارگردانی انجام نشد",
  });

/** پیامِ موفقیت را صفحه از روی سندِ قبل و بعد می‌سازد (`scanOutcome`)، چون interceptor پیامِ سرور را برنمی‌گرداند. */
export const useScanStocktakeMutation = () =>
  useStocktakeMutation({ mutationFn: scanStocktakeUnits, failure: "ثبتِ اسکن انجام نشد" });

export const useRemoveStocktakeScanMutation = () =>
  useStocktakeMutation({ mutationFn: removeStocktakeScan, success: "اسکن برداشته شد", failure: "برداشتنِ اسکن انجام نشد" });

export const useCountStocktakeLineMutation = () =>
  useStocktakeMutation({ mutationFn: countStocktakeLine, failure: "ثبتِ شمارش انجام نشد" });

const TRANSITIONS = {
  SubmitStocktake: { success: "شمارش تمام شد؛ مغایرت‌ها آماده‌ی بازبینی است", failure: "پایانِ شمارش انجام نشد" },
  ReopenStocktake: { success: "شمارش دوباره باز شد", failure: "بازگشاییِ شمارش انجام نشد" },
  ApproveStocktake: { success: "انبارگردانی تأیید و مغایرت‌ها اعمال شد", failure: "تأییدِ انبارگردانی انجام نشد", affectsStock: true },
  CancelStocktake: { success: "انبارگردانی لغو شد", failure: "لغوِ انبارگردانی انجام نشد" },
};

/** `action` یکی از کلیدهای `TRANSITIONS`؛ تأیید موجودی را عوض می‌کند و کلیدِ ایدمپوتنسی دارد. */
export const useStocktakeTransitionMutation = (action) =>
  useStocktakeMutation({
    mutationFn: (id) =>
      changeStocktakeStatus(action, id, {
        idempotencyKey: TRANSITIONS[action].affectsStock ? idempotencyKeyFor({ id }, action) : undefined,
      }),
    ...TRANSITIONS[action],
  });
