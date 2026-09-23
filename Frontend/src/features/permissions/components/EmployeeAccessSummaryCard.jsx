import { useMemo, useState } from "react";
import { CircleCheck, KeyRound, Settings2, TriangleAlert } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { usePermission } from "@/features/auth/hooks/usePermission";

import {
  useDepartmentPermissionTemplateQuery,
  useUserPermissionsQuery,
} from "../services/queries";
import GroupChips from "./GroupChips";
import UserPermissionsPanel from "./UserPermissionsPanel";
import UnsavedChangesDialog from "./UnsavedChangesDialog";
import { difference, toNumberSet } from "./permissionSets";

const toFa = (n) => n.toLocaleString("fa-IR");

/** یک خطِ وضعیت: کارمند نسبت به الگوی واحد کجاست. */
function TemplateStatus({ template, held }) {
  if (!template) return null;
  const suggested = toNumberSet(template.permissions);
  const name = template.departmentName;

  if (suggested.size === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        واحد «{name}» هنوز الگوی دسترسی ندارد.
      </p>
    );
  }

  const missing = difference(suggested, held).length;
  const extra = difference(held, suggested).length;

  if (missing === 0 && extra === 0) {
    return (
      <p className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <CircleCheck className="size-3.5" />
        مطابق الگوی واحد «{name}»
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      نسبت به الگوی «{name}»:{" "}
      {[missing > 0 && `${toFa(missing)} مورد کم`, extra > 0 && `${toFa(extra)} مورد اضافه`]
        .filter(Boolean)
        .join("، ")}
    </p>
  );
}

/**
 * خلاصه‌ی دسترسی‌های کارمند در صفحه‌ی ویرایشش، و Sheetی برای ویرایش.
 *
 * ویرایشگر در Sheet باز می‌شود نه صفحه‌ی دیگر، تا واحدِ *انتخاب‌شده در فرم*
 * (که هنوز ذخیره نشده) در دسترس بماند: وقتی ادمین کارمند را جابه‌جا می‌کند،
 * همین کارت هشدار می‌دهد و الگوی واحدِ مقصد را پیشنهاد می‌کند.
 *
 * بدون `PermissionView` چیزی رندر نمی‌شود.
 */
export default function EmployeeAccessSummaryCard({
  userId,
  isSelf,
  departmentId,
  initialDepartmentId,
}) {
  const { can, isPending } = usePermission();
  const canView = can("PermissionView");
  const editable = can("PermissionManage");

  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const { data, isLoading } = useUserPermissionsQuery(userId, { enabled: canView });
  const hasDepartment = departmentId != null && departmentId !== "";
  const { data: template } = useDepartmentPermissionTemplateQuery(departmentId, {
    enabled: canView && hasDepartment,
  });

  const held = useMemo(() => toNumberSet(data?.permissions), [data]);

  if (isPending || !canView) return null;

  const moving =
    hasDepartment &&
    initialDepartmentId != null &&
    String(departmentId) !== String(initialDepartmentId);

  const handleOpenChange = (next) => {
    if (!next && dirty) setConfirmClose(true);
    else setOpen(next);
  };

  return (
    <>
      <FormSectionCard
        icon={KeyRound}
        title="سطح دسترسی"
        contentClassName="px-6 py-4"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setOpen(true)}
          >
            <Settings2 className="size-3.5" />
            {editable ? "مدیریت" : "مشاهده"}
          </Button>
        }
      >
        {isLoading || !data ? (
          <Skeleton className="h-14 w-full rounded-lg" />
        ) : (
          <div className="space-y-2.5">
            {moving && template && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <div className="flex-1">
                  با جابه‌جایی به «{template.departmentName}» دسترسی‌ها خودکار عوض
                  نمی‌شوند.
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setOpen(true)}
                      className="mr-1 font-semibold underline underline-offset-2"
                    >
                      بررسی الگوی این واحد
                    </button>
                  )}
                </div>
              </div>
            )}

            {held.size === 0 ? (
              <p className="text-sm text-muted-foreground">
                این کارمند هنوز هیچ دسترسی‌ای ندارد.
              </p>
            ) : (
              <>
                <p className="text-sm">
                  <span className="font-semibold">{toFa(held.size)}</span>{" "}
                  دسترسی
                </p>
                <GroupChips groups={data.permissionGroups} selected={held} />
              </>
            )}

            {!moving && <TemplateStatus template={template} held={held} />}
          </div>
        )}
      </FormSectionCard>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="left"
          className="w-full gap-0 p-0 sm:max-w-3xl data-[side=left]:sm:max-w-3xl"
        >
          <SheetHeader className="border-b border-border pl-12">
            <SheetTitle>سطح دسترسی {data?.fullName ?? ""}</SheetTitle>
            <SheetDescription>
              تغییرات جدا از فرمِ کارمند ذخیره می‌شوند و بلافاصله اثر دارند.
            </SheetDescription>
          </SheetHeader>
          {open && (
            <UserPermissionsPanel
              className="flex-1 p-4"
              userId={userId}
              isSelf={isSelf}
              departmentId={departmentId}
              moving={moving}
              onDirtyChange={setDirty}
            />
          )}
        </SheetContent>
      </Sheet>

      <UnsavedChangesDialog
        open={confirmClose}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          setDirty(false);
          setOpen(false);
        }}
      />
    </>
  );
}
