import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { productKeys } from "@/features/warehouse/products/services/queryKeys";
import { purchaseKeys } from "@/features/purchases/orders/services/queryKeys";
import { supplierKeys } from "@/features/suppliers/services/queryKeys";
import { UNIT_ACTION_META } from "../domain/unitVocabulary";
import {
  resolveScannedCode,
  markProductUnitsPrinted,
  applyProductUnitAction,
} from "./api-v1";
import { productUnitKeys } from "./queryKeys";

/**
 * تشخیص کد اسکن‌شده (دانه، کالا، یا هیچ‌کدام).
 *
 * mutation است نه query: اسکن یک «کار» است و نتیجه‌اش در همان لحظه مصرف
 * می‌شود (باز کردنِ دانه، افزودن به انتخاب، شمردن).
 */
export const useResolveScannedCodeMutation = ({ silent = false } = {}) =>
  useMutation({
    mutationFn: resolveScannedCode,
    onError: (error) => {
      if (!silent) toast.error(error?.message || "خطا در جست‌وجوی کد");
    },
  });

export const useMarkUnitsPrintedMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (units) => markProductUnitsPrinted(units.map((unit) => unit.id)),
    onSuccess: (_, units) => {
      toast.success(`چاپِ ${units.length.toLocaleString("fa-IR")} برچسب ثبت شد`);
      queryClient.invalidateQueries({ queryKey: productUnitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productUnitKeys.summaries() });
    },
    onError: (error) =>
      toast.error(
        error?.response?.status === 404
          ? "برچسب‌ها چاپ شدند، ولی ثبتِ چاپ هنوز روی سرور پیاده نشده است."
          : error?.message || "ثبتِ چاپ انجام نشد",
      ),
  });
};

/**
 * قرنطینه / آزادسازی / اسقاطِ دستی. موجودیِ کالا عوض می‌شود، پس فهرستِ
 * کالاها و کارت‌های موجودی هم باید تازه شوند؛ برای قرنطینه‌ی دریافتِ خرید
 * حسابِ خرید و تامین‌کننده هم عوض می‌شود.
 */
export const useApplyUnitActionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables) =>
      applyProductUnitAction(variables, { idempotencyKey: idempotencyKeyFor(variables) }),
    onSuccess: (_, variables) => {
      const count = variables.productUnitIds.length.toLocaleString("fa-IR");
      toast.success(`${UNIT_ACTION_META[variables.action].label}: ${count} دانه`);
      queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
    onError: (error) => toast.error(error?.message || "انجام نشد"),
  });
};
