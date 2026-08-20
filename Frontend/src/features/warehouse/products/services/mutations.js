// src/features/warehouse/products/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  generateProductCode,
  generateProductBarcode,
} from "./api-mockData";
import { ROUTES } from "@/shared/constants/routes";
import { productKeys } from "./queryKeys";

export const useCreateProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      toast.success("کالا با موفقیت ایجاد شد");
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ایجاد کالا");
    },
  });
};

export const useUpdateProductMutation = (id) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (productData) => updateProduct(id, productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success("کالا با موفقیت ویرایش شد");
      navigate(ROUTES.WAREHOUSE_PRODUCTS);
    },
    onError: (error) => {
      toast.error(error.message || "خطا در ویرایش کالا");
    },
  });
};

/**
 * تولید خودکار کد کالا. چیزی در کش تغییر نمی‌کند، پس نیازی به
 * invalidate نیست؛ مقدار برگشتی روی همان فیلد فرم می‌نشیند و
 * کاربر می‌تواند بعد از آن دستی ویرایشش کند.
 */
export const useGenerateProductCodeMutation = () =>
  useMutation({
    mutationFn: generateProductCode,
    onError: (error) => {
      toast.error(error?.message || "خطا در تولید کد کالا");
    },
  });

/** تولید خودکار بارکد — مستقل از کد کالا. */
export const useGenerateProductBarcodeMutation = () =>
  useMutation({
    mutationFn: generateProductBarcode,
    onError: (error) => {
      toast.error(error?.message || "خطا در تولید بارکد");
    },
  });

export const useDeleteProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success("کالا با موفقیت حذف شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در حذف کالا");
    },
  });
};