// src/features/warehouse/units/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { generateProductUnits, markUnitsPrinted } from "./api-mockData";
import { productUnitKeys, pendingLabelKeys } from "./queryKeys";

export const useGenerateProductUnitsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateProductUnits,
    onSuccess: (units) => {
      toast.success(`${units.length} برچسب ساخته شد`);
      queryClient.invalidateQueries({ queryKey: productUnitKeys.lists() });
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
      queryClient.invalidateQueries({ queryKey: productUnitKeys.lists() });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت وضعیت چاپ");
    },
  });
};
