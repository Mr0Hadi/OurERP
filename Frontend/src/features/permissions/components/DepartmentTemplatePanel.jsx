import { useEffect } from "react";

import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { usePermission } from "@/features/auth/hooks/usePermission";

import { useDepartmentPermissionTemplateQuery } from "../services/queries";
import { useUpdateDepartmentPermissionTemplateMutation } from "../services/mutations";
import { usePermissionDraft } from "../hooks/usePermissionDraft";
import PermissionEditor from "./PermissionEditor";
import SaveBar from "./SaveBar";
import { orderedByCatalogue } from "./permissionSets";

function Editor({ departmentId, data, editable, onDirtyChange }) {
  const mutation = useUpdateDepartmentPermissionTemplateMutation();
  const groups = data.permissionGroups;
  const draft = usePermissionDraft(data.permissions);

  useEffect(() => {
    onDirtyChange?.(draft.dirty);
  }, [draft.dirty, onDirtyChange]);

  const save = () => {
    const saved = draft.selected;
    mutation.mutate(
      { departmentId, permissions: orderedByCatalogue(groups, saved) },
      { onSuccess: () => draft.commit(saved) },
    );
  };

  return (
    <PermissionEditor
      className="flex-1"
      groups={groups}
      selected={draft.selected}
      onChange={draft.setSelected}
      baseline={draft.baseline}
      disabled={!editable || mutation.isPending}
      footer={
        editable ? (
          <SaveBar
            added={draft.added}
            removed={draft.removed}
            isSaving={mutation.isPending}
            onReset={draft.reset}
            onSave={save}
            saveLabel="ذخیره الگو"
            idleText={`${draft.baseline.size.toLocaleString("fa-IR")} دسترسی در الگو`}
          />
        ) : null
      }
    />
  );
}

/**
 * ویرایشِ الگوی یک واحد. الگو به کسی دسترسی نمی‌دهد و تغییرش دسترسیِ
 * کارمندانِ فعلی را عوض نمی‌کند؛ فقط هنگام تنظیمِ دسترسیِ کارمندان پیشنهاد
 * می‌شود.
 */
export default function DepartmentTemplatePanel({
  departmentId,
  onDirtyChange,
  className,
}) {
  const { can } = usePermission();
  const editable = can("PermissionManage");

  const { data, isLoading, isError, error } =
    useDepartmentPermissionTemplateQuery(departmentId);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {isLoading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : isError || !data ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {error?.message || "خطا در دریافت الگوی دسترسی واحد."}
        </p>
      ) : (
        <Editor
          key={departmentId}
          departmentId={departmentId}
          data={data}
          editable={editable}
          onDirtyChange={onDirtyChange}
        />
      )}
    </div>
  );
}
