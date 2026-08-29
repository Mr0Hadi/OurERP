// src/features/employees/pages/EmployeeNewPage.jsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { ROUTES } from "@/shared/constants/routes";
import { useFormDraft } from "@/shared/hooks/useFormDraft";

import { useCreateEmployeeMutation } from "../services/mutations";
import { useEmployeeForm } from "../hooks/useEmployeeForm";
import EmployeeIdentityForm from "../components/forms/EmployeeIdentityForm";
import EmployeeCredentialsForm from "../components/forms/EmployeeCredentialsForm";
import EmployeeOrgForm from "../components/forms/EmployeeOrgForm";

const DRAFT_KEY = "employee:new";

/**
 * مقادیرِ اولیه = پیش‌نویسِ ذخیره‌شده + هر چیزی که تازه ساخته شده.
 *
 * وقتی کاربر از همین‌جا به «واحد جدید» می‌رود و برمی‌گردد، صفحه‌ی واحد
 * شناسه‌ی واحدِ ساخته‌شده را در `location.state` می‌گذارد؛ همان را روی
 * پیش‌نویس می‌نشانیم تا کاربر مجبور نباشد چیزی را که همین الان ساخته
 * دوباره از فهرست پیدا کند.
 */
function mergeDraft(draft, state) {
  if (!draft && !state?.createdDepartmentId && !state?.createdTeamId) {
    return null;
  }

  const merged = { ...(draft ?? {}) };

  if (state?.createdDepartmentId != null) {
    merged.departmentId = state.createdDepartmentId;
  }
  if (state?.createdTeamId != null) {
    // تیمِ تازه‌ساخته‌شده واحدِ خودش را هم تحمیل می‌کند؛ اگر کاربر در
    // صفحه‌ی تیم واحد دیگری انتخاب کرده باشد، همان درست است.
    merged.teamId = state.createdTeamId;
    if (state.createdTeamDepartmentId != null) {
      merged.departmentId = state.createdTeamDepartmentId;
    }
  }

  return merged;
}

export default function EmployeeNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const createMutation = useCreateEmployeeMutation();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { draft, saveDraft, clearDraft } = useFormDraft(DRAFT_KEY);

  useEffect(() => {
    setHeader({ title: "ثبت کارمند جدید", showBack: true });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  const { formMethods, buildPayload } = useEmployeeForm(
    null,
    mergeDraft(draft, location.state),
  );
  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors },
  } = formMethods;

  const onSubmit = (data) => {
    createMutation.mutate(buildPayload(data), {
      onSuccess: () => {
        clearDraft();
        navigate(ROUTES.EMPLOYEES);
      },
    });
  };

  /**
   * رفتن به یک صفحه‌ی «ایجاد جدید» بدون از دست دادن فرم: مقادیر فعلی
   * ذخیره می‌شوند و صفحه‌ی مقصد می‌داند که باید به همین‌جا برگردد —
   * همان کاری که فرم «ثبت خرید جدید» برای تامین‌کننده و کالا می‌کند.
   */
  const leaveForCreate = (target, state) => {
    saveDraft(getValues());
    navigate(target, { state: { returnTo: ROUTES.EMPLOYEES_NEW, ...state } });
  };

  const isBusy = createMutation.isPending;

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
              isEditing={false}
            />
            <EmployeeCredentialsForm
              register={register}
              errors={errors}
              watch={watch}
            />
          </div>

          {/* ستون چپ - جایگاه سازمانی و دکمه‌ها */}
          <div className="lg:col-span-1 space-y-4">
            <EmployeeOrgForm
              control={control}
              errors={errors}
              setValue={setValue}
              onCreateDepartment={() =>
                leaveForCreate(ROUTES.ORG_DEPARTMENTS_NEW)
              }
              onCreateTeam={() =>
                leaveForCreate(ROUTES.ORG_TEAMS_NEW, {
                  departmentId: getValues("departmentId"),
                })
              }
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearDraft();
                  navigate(-1);
                }}
                disabled={isBusy}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
              <Button type="submit" disabled={isBusy} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {isBusy ? "در حال ثبت..." : "ثبت کارمند"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
