// src/features/employees/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
  createEmployee,
  updateEmployee,
  assignEmployeeMembership,
  removeEmployee,
  logoutEmployee,
} from "./api-v1";
import { employeeKeys } from "./queryKeys";
import { teamKeys } from "@/features/organization/teams/services/queryKeys";
import { departmentKeys } from "@/features/organization/departments/services/queryKeys";

export function useCreateEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      toast.success("کارمند جدید با موفقیت ثبت شد.");
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      // شمارنده‌ی اعضای واحد و تیم عوض شده است.
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
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
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ویرایش کارمند");
    },
  });
}

/**
 * افزودن، حذف و «هد کردن»ِ عضو در صفحه‌ی جزئیات تیم — روی
 * `ChangeUserTeam` سرور.
 *
 * پیام موفقیت را خودِ صفحه تعیین می‌کند (`successMessage` در متغیرها)،
 * چون همین یک دستور هر سه کار را انجام می‌دهد و پیامِ خنثای «ویرایش شد»
 * به کاربر نمی‌گوید کدام اتفاق افتاد.
 */
export function useAssignEmployeeMembershipMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignEmployeeMembership,
    onSuccess: (_, variables) => {
      toast.success(variables.successMessage || "عضویت کارمند به‌روزرسانی شد.");
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در تغییر عضویت کارمند");
    },
  });
}

/**
 * «حذف» در این دامنه یعنی غیرفعال‌کردن: `DeleteUser` رکورد را نگه
 * می‌دارد و فقط `isActive` را false می‌کند، چون کارمند در تاریخچه‌ی
 * اسناد (خرید، فروش، رسید انبار) ارجاع دارد و پاک‌کردنش آن‌ها را
 * بی‌صاحب می‌کند. پس کارمندِ حذف‌شده هنوز در فهرست دیده می‌شود، با
 * برچسبِ «غیرفعال».
 */
export function useRemoveEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeEmployee,
    onSuccess: (_, id) => {
      toast.success("کارمند حذف شد.");
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در حذف کارمند");
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
