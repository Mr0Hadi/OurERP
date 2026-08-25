// src/features/organization/departments/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { createDepartment, updateDepartment, deleteDepartment } from "./api-mockData";
import { departmentKeys } from "./queryKeys";
import { teamKeys } from "../../teams/services/queryKeys";

export function useCreateDepartmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      toast.success("واحد جدید با موفقیت ثبت شد.");
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت واحد"),
  });
}

export function useUpdateDepartmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDepartment,
    onSuccess: (_, variables) => {
      toast.success("اطلاعات واحد با موفقیت ویرایش شد.");
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      queryClient.invalidateQueries({
        queryKey: departmentKeys.detail(variables.id),
      });
      // نام واحد در فهرست تیم‌ها هم نمایش داده می‌شود.
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
    onError: (error) => toast.error(error?.message || "خطا در ویرایش واحد"),
  });
}

export function useDeleteDepartmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: (_, id) => {
      toast.success("واحد با موفقیت حذف شد.");
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      queryClient.invalidateQueries({ queryKey: departmentKeys.detail(id) });
    },
    onError: (error) => toast.error(error?.message || "خطا در حذف واحد"),
  });
}
