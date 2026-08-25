// src/features/employees/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  logoutEmployee,
} from "./api-mockData";
import { employeeKeys } from "./queryKeys";

export function useCreateEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      toast.success("کارمند جدید با موفقیت ثبت شد.");
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت کارمند");
    },
  });
}

export function useUpdateEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // سرور کل رکورد را بازنویسی می‌کند، پس payload شامل همه‌ی فیلدهاست
    // (سند، بخش ۳) — نه فقط آن‌هایی که تغییر کرده‌اند.
    mutationFn: updateEmployee,
    onSuccess: (_, variables) => {
      toast.success("اطلاعات کارمند با موفقیت ویرایش شد.");
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(variables.id),
      });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ویرایش کارمند");
    },
  });
}

/**
 * «حذف» در این دامنه یعنی غیرفعال‌کردن: سرور رکورد را نگه می‌دارد و فقط
 * `isActive` را false می‌کند، چون کارمند در تاریخچه‌ی اسناد (خرید، فروش،
 * رسید انبار) ارجاع دارد و پاک‌کردنش آن‌ها را بی‌صاحب می‌کند.
 */
export function useDeactivateEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateEmployee,
    onSuccess: (_, id) => {
      toast.success("دسترسی کارمند غیرفعال شد.");
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در غیرفعال‌کردن کارمند");
    },
  });
}

/** خروج اجباری از همه‌ی سشن‌ها — بدون تغییر در خودِ حساب. */
export function useLogoutEmployeeMutation() {
  return useMutation({
    mutationFn: logoutEmployee,
    onSuccess: () => {
      toast.success("کارمند از تمام دستگاه‌ها خارج شد.");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در خروج اجباری کارمند");
    },
  });
}
