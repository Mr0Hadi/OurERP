import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "./api-v1";
import { productKeys } from "./queryKeys";
import { productUnitKeys } from "@/features/warehouse/units/services/queryKeys";
import { getErrorMessage } from "@/shared/lib/errorMessage";

/** رفتن به صفحه‌ی بعد با خودِ صفحه است (`onSuccess`ِ فراخوان)، نه این‌جا. */
export const useCreateProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      toast.success("کالا ثبت شد");
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "ثبت کالا انجام نشد"));
    },
  });
};

/**
 * تغییرِ موجودی دانه‌ها را اضافه یا کم می‌کند (`UpdateProduct` موجودی را با
 * دانه‌ها تطبیق می‌دهد)، پس کشِ دانه‌ها هم باطل می‌شود.
 */
export const useUpdateProductMutation = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productData) => updateProduct(id, productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
      toast.success("تغییرات کالا ذخیره شد");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "ذخیره‌ی تغییرات کالا انجام نشد"));
    },
  });
};

export const useDeleteProductMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success("کالا حذف شد");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "حذف کالا انجام نشد"));
    },
  });
};
