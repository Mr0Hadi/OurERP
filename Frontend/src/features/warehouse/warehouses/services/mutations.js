import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { getErrorMessage } from "@/shared/lib/errorMessage";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { productKeys } from "@/features/warehouse/products/services/queryKeys";
import { productUnitKeys } from "@/features/warehouse/units/services/queryKeys";
import {
  changeStockTransferStatus,
  createStockTransfer,
  createWarehouse,
  deactivateWarehouse,
  updateWarehouse,
} from "./api-v1";
import { warehouseKeys } from "./queryKeys";

/**
 * هر نوشتن همه‌ی کلیدهای انبار را باطل می‌کند (شمارِ دانه‌ها و انبارِ پیش‌فرض در همه‌ی انتخابگرها). حواله دانه‌ها را
 * جابه‌جا می‌کند و موجودیِ کالا را (در راه = بیرون از موجودی)، پس کالا و دانه‌ها هم تازه می‌شوند.
 */
function useWarehouseMutation({ mutationFn, success, failure, affectsStock = false }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (result?.transferNumber && result?.id != null) {
        queryClient.setQueryData(warehouseKeys.transferDetail(result.id), result);
      }
      queryClient.invalidateQueries({ queryKey: warehouseKeys.all });
      if (affectsStock) {
        queryClient.invalidateQueries({ queryKey: productKeys.all });
        queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
      }
      toast.success(success);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, failure));
      // درخواستی که در مرورگر timeout خورد ممکن است روی سرور انجام شده باشد؛ همه از نو خوانده می‌شوند تا صفحه همان
      // را نشان دهد که روی سرور است.
      queryClient.invalidateQueries({ queryKey: warehouseKeys.all });
    },
  });
}

export const useCreateWarehouseMutation = () =>
  useWarehouseMutation({ mutationFn: createWarehouse, success: "انبار ثبت شد", failure: "ثبتِ انبار انجام نشد" });

export const useUpdateWarehouseMutation = () =>
  useWarehouseMutation({ mutationFn: updateWarehouse, success: "انبار ویرایش شد", failure: "ویرایشِ انبار انجام نشد" });

export const useDeactivateWarehouseMutation = () =>
  useWarehouseMutation({
    mutationFn: deactivateWarehouse,
    success: "انبار غیرفعال شد",
    failure: "غیرفعال‌کردنِ انبار انجام نشد",
  });

export const useCreateStockTransferMutation = () =>
  useWarehouseMutation({
    // تکرارِ درخواست بی کلید یعنی دو حواله و دو بار خروجِ دانه‌ها.
    mutationFn: (body) => createStockTransfer(body, { idempotencyKey: idempotencyKeyFor(body, "stock-transfer") }),
    success: "حواله ثبت شد؛ دانه‌ها در راه‌اند",
    failure: "ثبتِ حواله انجام نشد",
    affectsStock: true,
  });

const TRANSITIONS = {
  ReceiveStockTransfer: { success: "حواله تحویل شد", failure: "تحویلِ حواله انجام نشد" },
  CancelStockTransfer: { success: "حواله لغو شد؛ دانه‌ها به مبدأ برگشتند", failure: "لغوِ حواله انجام نشد" },
};

/** `action`: `ReceiveStockTransfer` یا `CancelStockTransfer`. */
export const useStockTransferTransitionMutation = (action) =>
  useWarehouseMutation({
    mutationFn: (id) => changeStockTransferStatus(action, id),
    ...TRANSITIONS[action],
    affectsStock: true,
  });
