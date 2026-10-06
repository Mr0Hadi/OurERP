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
  setProductUnitLocation,
} from "./api-v1";
import { productUnitKeys } from "./queryKeys";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { formatNumber } from "@/shared/lib/numberFormat";

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
      if (!silent) toast.error(getErrorMessage(error, "جست‌وجوی کد انجام نشد"));
    },
  });

export const useMarkUnitsPrintedMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (units) => markProductUnitsPrinted(units.map((unit) => unit.id)),
    onSuccess: (_, units) => {
      toast.success(`چاپِ ${formatNumber(units.length)} برچسب ثبت شد`);
      queryClient.invalidateQueries({ queryKey: productUnitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productUnitKeys.summaries() });
    },
    onError: (error) => toast.error(getErrorMessage(error, "ثبتِ چاپ انجام نشد")),
  });
};

/**
 * قرنطینه / آزادسازی / اسقاطِ دستی. موجودیِ کالا عوض می‌شود، پس فهرستِ
 * کالاها و کارت‌های موجودی هم باید تازه شوند؛ گزارشِ قرنطینه‌ی خرید (سقفِ
 * مرجوعی) هم به همین دانه‌ها بسته است.
 */
export const useApplyUnitActionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: productUnitKeys.unitWrites(),
    mutationFn: (variables) =>
      applyProductUnitAction(variables, { idempotencyKey: idempotencyKeyFor(variables) }),
    onSuccess: (_, variables) => {
      const count = formatNumber(variables.productUnitIds.length);
      toast.success(`${UNIT_ACTION_META[variables.action].label}: ${count} دانه`);
      queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
    onError: (error, variables) =>
      toast.error(
        getErrorMessage(error, `${UNIT_ACTION_META[variables.action].label} انجام نشد`),
      ),
  });
};

/** قفسه‌ی دانه‌ها — فقط جایگاه عوض می‌شود، نه وضعیت یا موجودی. */
export const useSetUnitLocationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: productUnitKeys.unitWrites(),
    mutationFn: setProductUnitLocation,
    onSuccess: (_, variables) => {
      const count = formatNumber(variables.productUnitIds.length);
      toast.success(
        variables.binLocation?.trim()
          ? `قفسه‌ی ${count} دانه ثبت شد`
          : `قفسه‌ی ${count} دانه پاک شد`,
      );
      queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, "ثبتِ قفسه انجام نشد")),
  });
};
