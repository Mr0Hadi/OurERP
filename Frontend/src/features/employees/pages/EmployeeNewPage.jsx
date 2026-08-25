// src/features/employees/pages/EmployeeNewPage.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { ROUTES } from "@/shared/constants/routes";

import { useCreateEmployeeMutation } from "../services/mutations";
import { useEmployeeForm } from "../hooks/useEmployeeForm";
import EmployeeIdentityForm from "../components/forms/EmployeeIdentityForm";
import EmployeeAccessForm from "../components/forms/EmployeeAccessForm";
import EmployeeCredentialsForm from "../components/forms/EmployeeCredentialsForm";

export default function EmployeeNewPage() {
  const navigate = useNavigate();
  const createMutation = useCreateEmployeeMutation();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  useEffect(() => {
    setHeader({ title: "ثبت کارمند جدید", showBack: true });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  const { formMethods, buildPayload } = useEmployeeForm();
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = formMethods;

  const onSubmit = (data) => {
    createMutation.mutate(buildPayload(data), {
      onSuccess: () => navigate(ROUTES.EMPLOYEES),
    });
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

          {/* ستون چپ - نقش و دکمه‌ها */}
          <div className="lg:col-span-1 space-y-4">
            <EmployeeAccessForm control={control} isEditing={false} />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
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
