import { useMemo } from "react";
import { Link } from "react-router-dom";
import { LayoutTemplate, Pencil } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ROUTES } from "@/shared/constants/routes";
import { usePermission } from "@/features/auth/hooks/usePermission";

import { useDepartmentPermissionTemplateQuery } from "../services/queries";
import GroupChips from "./GroupChips";
import { toNumberSet } from "./permissionSets";

/**
 * خلاصه‌ی الگوی دسترسیِ واحد در صفحه‌ی واحد؛ ویرایش در صفحه‌ی
 * «الگوهای واحدها». بدون `PermissionView` چیزی رندر نمی‌شود.
 */
export default function DepartmentTemplateSummaryCard({ departmentId }) {
  const { can, isPending } = usePermission();
  const canView = can("PermissionView");

  const { data, isLoading } = useDepartmentPermissionTemplateQuery(departmentId, {
    enabled: canView,
  });
  const selected = useMemo(() => toNumberSet(data?.permissions), [data]);

  if (isPending || !canView) return null;

  return (
    <FormSectionCard
      icon={LayoutTemplate}
      title="الگوی دسترسی"
      contentClassName="px-6 py-4"
      action={
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to={ROUTES.ACCESS_TEMPLATES_DETAIL.replace(":id", departmentId)}>
            <Pencil className="size-3.5" />
            {can("PermissionManage") ? "ویرایش" : "مشاهده"}
          </Link>
        </Button>
      }
    >
      {isLoading || !data ? (
        <Skeleton className="h-12 w-full rounded-lg" />
      ) : selected.size === 0 ? (
        <p className="text-sm text-muted-foreground">
          هنوز الگویی تعریف نشده. با تعریفش، هنگام تنظیم دسترسیِ کارمندانِ این
          واحد به مدیر پیشنهاد می‌شود.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-semibold">
              {selected.size.toLocaleString("fa-IR")}
            </span>{" "}
            دسترسی پیشنهادی برای کارمندانِ این واحد
          </p>
          <GroupChips groups={data.permissionGroups} selected={selected} />
        </div>
      )}
    </FormSectionCard>
  );
}
