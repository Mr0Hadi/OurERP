// src/features/warehouse/categories/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { createProductCategory } from "./api-v1";
import { productCategoryKeys } from "./queryKeys";

export const useCreateProductCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productCategoryKeys.lists() });
      toast.success("دسته‌بندی جدید اضافه شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ساخت دسته‌بندی");
    },
  });
};
