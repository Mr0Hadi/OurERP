// src/features/warehouse/units/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import {
  generateProductUnits,
  markUnitsPrinted,
  fetchUnitByCode,
} from "./api-mockData";
import { productUnitKeys, pendingLabelKeys } from "./queryKeys";

/**
 * یافتن واحد با کد اسکن‌شده.
 *
 * عمداً mutation است نه query: اسکن یک «کار» است که کاربر انجام می‌دهد،
 * نه حالتی که از فیلترها مشتق شود — و نتیجه در onSuccess مصرف می‌شود،
 * بدون useEffectِ واکنشی.
 */
export const useFindUnitByCodeMutation = () =>
  useMutation({
    mutationFn: fetchUnitByCode,
    onError: (error) => {
      toast.error(error?.message || "خطا در جست‌وجوی واحد");
    },
  });

export const useGenerateProductUnitsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateProductUnits,
    onSuccess: (units) => {
      toast.success(`${units.length} برچسب ساخته شد`);
      queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
      queryClient.invalidateQueries({ queryKey: pendingLabelKeys.lists() });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ساخت برچسب‌ها");
    },
  });
};

export const useMarkUnitsPrintedMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markUnitsPrinted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت وضعیت چاپ");
    },
  });
};
