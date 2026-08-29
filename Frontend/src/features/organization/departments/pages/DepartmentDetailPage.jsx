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
import { useFormDraft } from "@/shared/hooks/useFormDraft";
import OrgDetailLoading from "../../components/OrgDetailLoading";

import {
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} from "../services/mutations";
import { useDepartmentQuery } from "../services/queries";
import { useTeamOptionsQuery } from "../../teams/services/queries";
import { useDepartmentUserCountQuery } from "@/features/employees/services/queries";
import { useDepartmentForm } from "../hooks/useDepartmentForm";
import DepartmentIdentityForm from "../components/forms/DepartmentIdentityForm";
import DepartmentTeamsCard from "../components/DepartmentTeamsCard";
import OrgLeadershipForm from "../../components/OrgLeadershipForm";

function DepartmentDetailForm({ department }) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const selfPath = `/organization/departments/${department.id}`;

  const updateMutation = useUpdateDepartmentMutation();
  const deleteMutation = useDeleteDepartmentMutation();

  /**
   * شمارنده‌ها از خودِ داده شمرده می‌شوند، نه از رکوردِ واحد:
   * `GetDepartmentDetail` در سرور `TeamCount`/`UserCount` ندارد (فقط
   * `GetDepartmentList` دارد) و تکیه‌کردن به آن‌ها یعنی این صفحه همیشه
   * «۰ تیم / ۰ نفر» نشان بدهد و دکمه‌ی حذف هیچ‌وقت قفل نشود.
   *
   * هر دو query همان‌هایی هستند که کارت تیم‌ها و کارت اعضا هم می‌زنند،
   * پس react-query یکی‌شان می‌کند و درخواستِ اضافه‌ای نمی‌رود.
   */
  const { teams } = useTeamOptionsQuery(department.id);
  const { count: userCount } = useDepartmentUserCountQuery(department.id);

  // رفتن به «تیم جدید» یا جزئیات یک تیم نباید تغییراتِ نیمه‌کاره‌ی همین
  // فرم را از بین ببرد — همان الگوی «ثبت خرید جدید».
  const { draft, saveDraft, clearDraft } = useFormDraft(
    `department:${department.id}`,
  );

  const { formMethods, buildPayload } = useDepartmentForm(department, draft);
  const {
    register,
    control,
    getValues,
    handleSubmit,
    formState: { errors },
  } = formMethods;

  const leaveWithDraft = (target, state) => {
    saveDraft(getValues());
    navigate(target, { state: { returnTo: selfPath, ...state } });
  };

  const onSubmit = (data) => {
    updateMutation.mutate(buildPayload(data), {
      onSuccess: () => {
        clearDraft();
        navigate(ROUTES.ORG_DEPARTMENTS);
      },
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate(department.id, {
      onSuccess: () => {
        clearDraft();
        navigate(ROUTES.ORG_DEPARTMENTS);
      },
    });
  };

  const isBusy = updateMutation.isPending || deleteMutation.isPending;
  const teamCount = teams.length;

  // سرور علاوه بر تیمِ فعال، کارمندِ فعال را هم بلاک می‌کند؛ UI باید همان
  // دو شرط را نشان بدهد وگرنه کاربر دکمه‌ی فعال می‌بیند و ۴۰۰ می‌گیرد.
  const blockingReason =
    teamCount > 0
      ? "این واحد تیم فعال دارد؛ اول تیم‌هایش را جابه‌جا یا حذف کنید."
      : userCount > 0
        ? "این واحد کارمند فعال دارد؛ اول کارمندها را به واحد دیگری منتقل کنید."
        : null;

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
                  {teamCount.toLocaleString("fa-IR")} تیم
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">تعداد کارمندان</span>
                <span className="font-medium">
                  {userCount.toLocaleString("fa-IR")} نفر
                </span>
              </div>
            </div>

            <DepartmentTeamsCard
              departmentId={department.id}
              departmentName={department.name}
              onOpenTeam={(teamId) =>
                leaveWithDraft(`/organization/teams/${teamId}`)
              }
              onCreateTeam={() =>
                leaveWithDraft(ROUTES.ORG_TEAMS_NEW, {
                  departmentId: department.id,
                })
              }
            />
          </div>

          <div className="lg:col-span-1 space-y-4">
            <OrgLeadershipForm
              control={control}
              errors={errors}
              scopeLabel="واحد"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearDraft();
                  navigate(ROUTES.ORG_DEPARTMENTS);
                }}
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
              disabled={isBusy || blockingReason != null}
            >
              <Trash2 className="h-4 w-4" />
              حذف واحد
            </Button>

            {blockingReason && (
              <p className="text-xs text-muted-foreground text-center">
                {blockingReason}
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
