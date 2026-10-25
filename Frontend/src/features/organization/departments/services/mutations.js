import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { createDepartment, updateDepartment, deleteDepartment } from "./api-v1";
import { invalidateOrgChart } from "../../services/invalidation";
import { getErrorMessage } from "@/shared/lib/errorMessage";

export function useCreateDepartmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      toast.success("واحد جدید با موفقیت ثبت شد.");
      invalidateOrgChart(queryClient);
    },
    onError: (error) => toast.error(getErrorMessage(error, "خطا در ثبت واحد")),
  });
}

export function useUpdateDepartmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDepartment,
    onSuccess: () => {
      toast.success("اطلاعات واحد با موفقیت ویرایش شد.");
      invalidateOrgChart(queryClient);
    },
    onError: (error) => toast.error(getErrorMessage(error, "خطا در ویرایش واحد")),
  });
}

export function useDeleteDepartmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      toast.success("واحد با موفقیت حذف شد.");
      invalidateOrgChart(queryClient);
    },
    onError: (error) => toast.error(getErrorMessage(error, "خطا در حذف واحد")),
  });
}
