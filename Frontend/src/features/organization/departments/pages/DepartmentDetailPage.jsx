// src/features/organization/departments/pages/DepartmentDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, X, Trash2 } from "lucide-react";

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
import OrgDetailLoading from "../../components/OrgDetailLoading";

import {
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} from "../services/mutations";
import { useDepartmentQuery } from "../services/queries";
import { useDepartmentForm } from "../hooks/useDepartmentForm";
import {
  useEmployeeOptions,
  labelOfOption,
} from "../../hooks/useEmployeeOptions";
import DepartmentIdentityForm from "../components/forms/DepartmentIdentityForm";
import OrgLeadershipForm from "../../components/OrgLeadershipForm";

function DepartmentDetailForm({ department }) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { options } = useEmployeeOptions();

  const updateMutation = useUpdateDepartmentMutation();
  const deleteMutation = useDeleteDepartmentMutation();

  const { formMethods, buildPayload } = useDepartmentForm(department);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = formMethods;

  const onSubmit = (data) => {
    updateMutation.mutate(
      buildPayload(data, labelOfOption(options, data.headId)),
      { onSuccess: () => navigate(ROUTES.ORG_DEPARTMENTS) },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(department.id, {
      onSuccess: () => navigate(ROUTES.ORG_DEPARTMENTS),
    });
  };

  const isBusy = updateMutation.isPending || deleteMutation.isPending;
  const hasTeams = Number(department.teamCount ?? 0) > 0;

  return (
    <div className="m-auto bg-background">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">
          <div className="lg:col-span-1 space-y-4">
            <DepartmentIdentityForm register={register} errors={errors} />

            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">تعداد تیم‌ها</span>
                <span className="font-medium">
                  {Number(department.teamCount ?? 0).toLocaleString("fa-IR")} تیم
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">تعداد کارمندان</span>
                <span className="font-medium">
                  {Number(department.userCount ?? 0).toLocaleString("fa-IR")} نفر
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <OrgLeadershipForm control={control} scopeLabel="واحد" />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.ORG_DEPARTMENTS)}
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
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isBusy || hasTeams}
            >
              <Trash2 className="h-4 w-4" />
              حذف واحد
            </Button>

            {hasTeams && (
              <p className="text-xs text-muted-foreground text-center">
                این واحد تیم دارد و تا وقتی تیم‌هایش جابه‌جا نشوند قابل حذف
                نیست.
              </p>
            )}
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف واحد</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{department.name}» اطمینان دارید؟ واحد غیرفعال می‌شود و
              دیگر در فهرست‌ها و انتخابگرها نمایش داده نمی‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "در حال حذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function DepartmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: department, isLoading, isError } = useDepartmentQuery(id);

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : department
          ? `ویرایش واحد: ${department.name}`
          : "خطا",
      showBack: true,
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, department, isLoading]);

  if (isLoading) return <OrgDetailLoading />;

  if (isError || !department) {
    return (
      <DetailErrorState
        message="واحد مورد نظر یافت نشد یا خطایی رخ داده است."
        onBack={() => navigate(ROUTES.ORG_DEPARTMENTS)}
      />
    );
  }

  return <DepartmentDetailForm key={department.id} department={department} />;
}
