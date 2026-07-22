// src/features/suppliers/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createSupplier, updateSupplier, deleteSupplier } from "./api-mockData";
import { supplierKeys } from "./queryKeys";

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      toast.success("تامین کننده جدید با موفقیت ثبت شد.");
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
    onError: (error) => {
      toast.error(error.message || "خطا در ثبت تامین کننده");
    },
  });
}

export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateSupplier(id, data),
    onSuccess: (_, variables) => {
      toast.success("اطلاعات تامین کننده با موفقیت ویرایش شد.");
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierKeys.detail(variables.id) });
    },
    onError: (error) => {
      toast.error(error.message || "خطا در ویرایش تامین کننده");
    },
  });
}

export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
      toast.success("تامین‌کننده با موفقیت حذف شد.");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در حذف تامین‌کننده.");
    },
  });
}
