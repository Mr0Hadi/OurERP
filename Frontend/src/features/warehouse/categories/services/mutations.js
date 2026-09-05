// src/features/warehouse/categories/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import {
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} from "./api-v1";
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

export const useUpdateProductCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }) => updateProductCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productCategoryKeys.lists() });
      toast.success("دسته‌بندی ویرایش شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ویرایش دسته‌بندی");
    },
  });
};

/**
 * حذف نرم است (بخش ۷ سند api-guide.fa.md) — کالاهای همان دسته پاک یا
 * بی‌دسته نمی‌شوند، دسته فقط از فهرست‌های بعدی بیرون می‌رود. سرور خودش
 * جلوی حذفِ دسته‌ی دارای کالا را نمی‌گیرد، پس هشدارِ پیش از تأیید در
 * دیالوگِ صفحه‌ی مدیریت انجام می‌شود، نه اینجا.
 */
export const useDeleteProductCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteProductCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productCategoryKeys.lists() });
      toast.success("دسته‌بندی حذف شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در حذف دسته‌بندی");
    },
  });
};
