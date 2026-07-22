// src/features/customers/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer, updateCustomer, deleteCustomer } from "./api-mockData";
import { customerKeys } from "./queryKeys";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      toast.success("مشتری جدید با موفقیت ثبت شد.");
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
    onError: (error) => {
      toast.error(error.message || "خطا در ثبت مشتری جدید.");
    },
  });
}

export const useUpdateCustomerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateCustomer(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
      toast.success("اطلاعات مشتری با موفقیت ویرایش شد.");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در ویرایش اطلاعات.");
    },
  });
};

export const useDeleteCustomerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      toast.success("مشتری با موفقیت حذف شد.");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در حذف مشتری.");
    },
  });
};
