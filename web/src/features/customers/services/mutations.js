// src/features/customers/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer, updateCustomer } from "./api";
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
      // پاک کردن کش لیست مشتریان برای دریافت داده‌های جدید
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      navigate("/customers"); // هدایت به صفحه لیست مشتریان
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
      // پاک کردن کش لیست و کش جزئیات همین مشتری تا اطلاعات جدید دریافت شود
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
      toast.success("اطلاعات مشتری با موفقیت ویرایش شد.");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در ویرایش اطلاعات.");
    },
  });
};
