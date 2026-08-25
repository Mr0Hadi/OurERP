// src/features/employees/pages/EmployeeDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, X, Ban, LogOut } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useHeaderStore } from "@/shared/store/headerStore";
import { ROUTES } from "@/shared/constants/routes";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

import {
  useUpdateEmployeeMutation,
  useDeactivateEmployeeMutation,
  useLogoutEmployeeMutation,
} from "../services/mutations";
import { useEmployeeQuery } from "../services/queries";
import { useEmployeeForm } from "../hooks/useEmployeeForm";
import EmployeeIdentityForm from "../components/forms/EmployeeIdentityForm";
import EmployeeAccessForm from "../components/forms/EmployeeAccessForm";
import EmployeeOrgForm from "../components/forms/EmployeeOrgForm";
import EmployeeDetailLoading from "../components/forms/EmployeeDetailLoading";

const fullNameOf = (employee) =>
  `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
  employee.username;

function EmployeeDetailForm({ employee }) {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const updateMutation = useUpdateEmployeeMutation();
  const deactivateMutation = useDeactivateEmployeeMutation();
  const logoutMutation = useLogoutEmployeeMutation();

  const { formMethods, buildPayload, departmentId } = useEmployeeForm(employee);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = formMethods;

  // ادمین نباید بتواند حساب خودش را از کار بیندازد؛ نتیجه‌اش قفل‌شدن بیرونِ
  // سیستم است و برای بازکردنش به یک ادمین دیگر نیاز پیدا می‌کند.
  const isSelf =
    currentUser != null && String(currentUser.id) === String(employee.id);

  const onSubmit = (data) => {
    updateMutation.mutate(buildPayload(data), {
      onSuccess: () => navigate(ROUTES.EMPLOYEES),
    });
  };

  const handleDeactivate = () => {
    deactivateMutation.mutate(employee.id, {
      onSuccess: () => navigate(ROUTES.EMPLOYEES),
    });
  };

  const handleForceLogout = () => {
    logoutMutation.mutate(employee.id, {
      onSuccess: () => setShowLogoutDialog(false),
    });
  };

  const isBusy =
    updateMutation.isPending ||
    deactivateMutation.isPending ||
    logoutMutation.isPending;

  const displayName = fullNameOf(employee);

  return (
    <div className="m-auto bg-background">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">
          {/* ستون راست - هویت و حساب کاربری */}
          <div className="lg:col-span-1 space-y-4">
            <EmployeeIdentityForm
              register={register}
              errors={errors}
              isEditing
            />

            <EmployeeOrgForm
              control={control}
              errors={errors}
              departmentId={departmentId}
            />
          </div>

          {/* ستون چپ - نقش، دسترسی و عملیات ادمین */}
          <div className="lg:col-span-1 space-y-4">
            <EmployeeAccessForm control={control} isEditing />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.EMPLOYEES)}
                disabled={isBusy}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
              <Button type="submit" disabled={isBusy} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? "در حال ثبت..." : "ذخیره تغییرات"}
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowLogoutDialog(true)}
              disabled={isBusy}
            >
              <LogOut className="h-4 w-4" />
              خروج اجباری از تمام دستگاه‌ها
            </Button>

            <Button
              type="button"
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setShowDeactivateDialog(true)}
              disabled={isBusy || isSelf || !employee.isActive}
            >
              <Ban className="h-4 w-4" />
              غیرفعال‌کردن دسترسی
            </Button>

            {isSelf && (
              <p className="text-xs text-muted-foreground text-center">
                نمی‌توانید دسترسی حساب کاربری خودتان را غیرفعال کنید.
              </p>
            )}
          </div>
        </div>
      </form>

      <AlertDialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>غیرفعال‌کردن دسترسی کارمند</AlertDialogTitle>
            <AlertDialogDescription>
              پس از این کار، {displayName} دیگر نمی‌تواند وارد سیستم شود. اسناد و
              تراکنش‌های ثبت‌شده توسط او حذف نمی‌شوند و در گزارش‌ها باقی
              می‌مانند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? "در حال انجام..." : "غیرفعال‌کن"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>خروج اجباری</AlertDialogTitle>
            <AlertDialogDescription>
              تمام نشست‌های فعال {displayName} بسته می‌شود و برای ادامه‌ی کار
              باید دوباره وارد شود. حساب کاربری او فعال باقی می‌ماند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={logoutMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? "در حال انجام..." : "خروج اجباری"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: employee, isLoading, isError } = useEmployeeQuery(id);

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : employee
          ? `ویرایش کارمند: ${fullNameOf(employee)}`
          : "خطا",
      showBack: true,
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, employee, isLoading]);

  if (isLoading) return <EmployeeDetailLoading />;

  if (isError || !employee) {
    return (
      <DetailErrorState
        message="کارمند مورد نظر یافت نشد یا خطایی رخ داده است."
        onBack={() => navigate(ROUTES.EMPLOYEES)}
      />
    );
  }

  return <EmployeeDetailForm key={employee.id} employee={employee} />;
}
