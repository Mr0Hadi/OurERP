// src/features/organization/departments/pages/DepartmentNewPage.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { ROUTES } from "@/shared/constants/routes";

import { useCreateDepartmentMutation } from "../services/mutations";
import { useDepartmentForm } from "../hooks/useDepartmentForm";
import {
  useEmployeeOptions,
  labelOfOption,
} from "../../hooks/useEmployeeOptions";
import DepartmentIdentityForm from "../components/forms/DepartmentIdentityForm";
import OrgLeadershipForm from "../../components/OrgLeadershipForm";
import PermissionAssignmentForm from "../../components/PermissionAssignmentForm";

export default function DepartmentNewPage() {
  const navigate = useNavigate();
  const createMutation = useCreateDepartmentMutation();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);
  const { options } = useEmployeeOptions();

  useEffect(() => {
    setHeader({ title: "ثبت واحد جدید", showBack: true });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  const { formMethods, buildPayload } = useDepartmentForm();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = formMethods;

  const onSubmit = (data) => {
    // نام مدیر از options برداشته می‌شود چون فهرست فقط شناسه دارد و جدول
    // برای نمایش به نام نیاز دارد؛ سرور خودش این را از join درمی‌آورد.
    const headName = labelOfOption(options, data.headId);

    createMutation.mutate(buildPayload(data, headName), {
      onSuccess: () => navigate(ROUTES.ORG_DEPARTMENTS),
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
          <div className="lg:col-span-1 space-y-4">
            <DepartmentIdentityForm register={register} errors={errors} />
          </div>

          <div className="lg:col-span-1 space-y-4">
            <OrgLeadershipForm control={control} scopeLabel="واحد" />

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
                {isBusy ? "در حال ثبت..." : "ثبت واحد"}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <PermissionAssignmentForm control={control} />
          </div>
        </div>
      </form>
    </div>
  );
}
