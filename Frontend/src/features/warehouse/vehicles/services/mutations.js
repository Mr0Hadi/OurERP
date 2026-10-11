import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { getErrorMessage } from "@/shared/lib/errorMessage";
import { productKeys } from "@/features/warehouse/products/services/queryKeys";
import {
  addProductsToVehicle,
  createVehicle,
  deleteVehicle,
  removeProductFromVehicle,
  updateVehicle,
} from "./api-v1";
import { vehicleKeys } from "./queryKeys";

/**
 * هر تغییری در خودروها شمارها، فهرستِ کالاهای هر خودرو و خودروهای رویِ
 * جزئیاتِ کالا را کهنه می‌کند؛ همه با هم باطل می‌شوند.
 */
function useInvalidateVehicles() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
    queryClient.invalidateQueries({ queryKey: productKeys.all });
  };
}

export const useCreateVehicleMutation = () => {
  const invalidate = useInvalidateVehicles();
  return useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      invalidate();
      toast.success("خودرو اضافه شد");
    },
    onError: (error) => toast.error(getErrorMessage(error, "افزودن خودرو انجام نشد")),
  });
};

export const useUpdateVehicleMutation = () => {
  const invalidate = useInvalidateVehicles();
  return useMutation({
    mutationFn: updateVehicle,
    onSuccess: () => {
      invalidate();
      toast.success("نام خودرو ویرایش شد");
    },
    onError: (error) => toast.error(getErrorMessage(error, "ویرایش خودرو انجام نشد")),
  });
};

export const useDeleteVehicleMutation = () => {
  const invalidate = useInvalidateVehicles();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      // جزئیاتِ کالا فرمِ ویرایش را یک‌بار از کش می‌سازد؛ «کهنه» علامت‌زدن کافی نیست و
      // فرم با خودروی حذف‌شده باز می‌شد. پاک‌کردن یعنی بارِ بعد از سرور خوانده شود.
      queryClient.removeQueries({ queryKey: productKeys.details() });
      invalidate();
      toast.success("خودرو حذف شد");
    },
    onError: (error) => toast.error(getErrorMessage(error, "حذف خودرو انجام نشد")),
  });
};

export const useAddProductsToVehicleMutation = () => {
  const invalidate = useInvalidateVehicles();
  return useMutation({
    mutationFn: addProductsToVehicle,
    onSuccess: (data) => {
      invalidate();
      toast.success(
        data?.addedCount === 0 ? "این کالاها از قبل برای این خودرو ثبت شده بودند" : "کالا به خودرو اضافه شد",
      );
    },
    onError: (error) => toast.error(getErrorMessage(error, "افزودن کالا انجام نشد")),
  });
};

export const useRemoveProductFromVehicleMutation = () => {
  const invalidate = useInvalidateVehicles();
  return useMutation({
    mutationFn: removeProductFromVehicle,
    onSuccess: (data) => {
      invalidate();
      toast.success(
        data?.becameUniversal
          ? "کالا حذف شد و حالا برای همه‌ی خودروها حساب می‌شود"
          : "کالا از این خودرو حذف شد",
      );
    },
    onError: (error) => toast.error(getErrorMessage(error, "حذف کالا از خودرو انجام نشد")),
  });
};
