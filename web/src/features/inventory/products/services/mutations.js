// src/features/inventory/products/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { createProduct, updateProduct } from "./api";
import { ROUTES } from '@/shared/constants/routes';
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
      queryClient.invalidateQueries({ 
        queryKey: ["products", "detail", String(id)]
      });
      queryClient.invalidateQueries({ 
        queryKey: ["products", "list"]
      });
      toast.success("کالا با موفقیت ویرایش شد");
      navigate(ROUTES.PRODUCTS_LIST);
    },
    onError: (error) => {
      toast.error(error.message || "خطا در ویرایش کالا");
    },
  });
};
