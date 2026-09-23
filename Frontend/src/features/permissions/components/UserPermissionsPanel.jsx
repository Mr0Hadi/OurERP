import { useEffect, useMemo, useState } from "react";

import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { usePermission } from "@/features/auth/hooks/usePermission";

import {
  useDepartmentPermissionTemplateQuery,
  useUserPermissionsQuery,
} from "../services/queries";
import { useUpdateUserPermissionsMutation } from "../services/mutations";
import { usePermissionDraft } from "../hooks/usePermissionDraft";
import PermissionEditor from "./PermissionEditor";
import SaveBar from "./SaveBar";
import TemplateBar from "./TemplateBar";
import { orderedByCatalogue, toNumberSet } from "./permissionSets";

function Editor({
  userId,
  data,
  isSelf,
  editable,
  departmentId,
  moving,
  onDirtyChange,
}) {
  const mutation = useUpdateUserPermissionsMutation();
  const groups = data.permissionGroups;
  const draft = usePermissionDraft(data.permissions);

  // ادمین نمی‌تواند `PermissionManage` را از خودش بگیرد (سرور ۴۰۰ می‌دهد).
  const locked = useMemo(() => {
    if (!isSelf) return new Set();
    const manage = groups
      .flatMap((g) => g.permissions)
      .find((p) => p.name === "PermissionManage")?.permission;
    return manage != null && draft.baseline.has(manage) ? new Set([manage]) : new Set();
  }, [groups, isSelf, draft.baseline]);

  // واحدِ الگو پیش‌فرض واحدِ کارمند است، ولی ادمین می‌تواند با الگوی واحدِ
  // دیگری مقایسه کند. با عوض‌شدنِ واحد در فرمِ کارمند، انتخابِ دستی کنار
  // می‌رود و الگوی مقصد نشان داده می‌شود.
  const [override, setOverride] = useState(null);
  const [overrideFor, setOverrideFor] = useState(departmentId);
  if (overrideFor !== departmentId) {
    setOverrideFor(departmentId);
    setOverride(null);
  }
  const templateDepartmentId = override ?? departmentId;

  const { data: template, isLoading: templateLoading } =
    useDepartmentPermissionTemplateQuery(templateDepartmentId, {
      enabled: templateDepartmentId != null && templateDepartmentId !== "",
    });
  const suggested = useMemo(
    () => (template ? toNumberSet(template.permissions) : null),
    [template],
  );

  useEffect(() => {
    onDirtyChange?.(draft.dirty);
  }, [draft.dirty, onDirtyChange]);

  const save = () => {
    const saved = draft.selected;
    mutation.mutate(
      { userId, permissions: orderedByCatalogue(groups, saved) },
      { onSuccess: () => draft.commit(saved) },
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <TemplateBar
        templateDepartmentId={templateDepartmentId}
        onTemplateDepartmentChange={setOverride}
        template={template}
        isLoading={templateLoading}
        moving={moving && override == null}
        selected={draft.selected}
        locked={locked}
        editable={editable}
        onApply={draft.setSelected}
      />

      <PermissionEditor
        className="flex-1"
        groups={groups}
        selected={draft.selected}
        onChange={draft.setSelected}
        baseline={draft.baseline}
        suggested={suggested}
        locked={locked}
        lockedHint="نمی‌توانید این دسترسی را از خودتان بگیرید."
        disabled={!editable || mutation.isPending}
        footer={
          editable ? (
            <SaveBar
              added={draft.added}
              removed={draft.removed}
              isSaving={mutation.isPending}
              onReset={draft.reset}
              onSave={save}
              saveLabel="ذخیره دسترسی‌ها"
              idleText={`${draft.baseline.size.toLocaleString("fa-IR")} دسترسی · تغییرات بلافاصله پس از ذخیره اثر دارند`}
            />
          ) : (
            <p className="px-1 text-xs text-muted-foreground">
              برای تغییر، دسترسی «مدیریت دسترسی‌های کاربران» لازم است.
            </p>
          )
        }
      />
    </div>
  );
}

/**
 * دسترسی‌های یک کارمند: نوارِ الگو + ویرایشگر + ذخیره. هم در صفحه‌ی
 * «دسترسی کارمندان» و هم در Sheetِ صفحه‌ی کارمند استفاده می‌شود.
 *
 * @param departmentId  واحدی که الگویش پیش‌فرض نشان داده می‌شود؛ در صفحه‌ی
 *                      کارمند واحدِ *فعلیِ فرم* است، نه ذخیره‌شده
 * @param moving        واحد در فرم عوض شده و هنوز ذخیره نشده
 */
export default function UserPermissionsPanel({
  userId,
  isSelf,
  departmentId,
  moving = false,
  onDirtyChange,
  className,
}) {
  const { can } = usePermission();
  const editable = can("PermissionManage");

  const { data, isLoading, isError, error } = useUserPermissionsQuery(userId);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : isError || !data ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {error?.message || "خطا در دریافت دسترسی‌های کارمند."}
        </p>
      ) : (
        <Editor
          key={userId}
          userId={userId}
          data={data}
          isSelf={isSelf}
          editable={editable}
          departmentId={departmentId}
          moving={moving}
          onDirtyChange={onDirtyChange}
        />
      )}
    </div>
  );
}
