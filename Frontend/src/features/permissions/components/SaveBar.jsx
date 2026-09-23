import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

const toFa = (n) => n.toLocaleString("fa-IR");

/** نوارِ پایینیِ ویرایشگر: خلاصه‌ی تغییرات + بازگردانی + ذخیره. */
export default function SaveBar({
  added,
  removed,
  isSaving,
  onReset,
  onSave,
  idleText,
  saveLabel = "ذخیره",
}) {
  const dirty = added + removed > 0;

  return (
    <div className="flex items-center gap-2">
      <p className="flex-1 truncate text-xs text-muted-foreground">
        {dirty ? (
          <>
            {added > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">
                {toFa(added)} افزوده
              </span>
            )}
            {added > 0 && removed > 0 && "، "}
            {removed > 0 && (
              <span className="text-destructive">{toFa(removed)} حذف</span>
            )}{" "}
            — ذخیره نشده
          </>
        ) : (
          idleText
        )}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5"
        disabled={!dirty || isSaving}
        onClick={onReset}
      >
        <RotateCcw className="size-3.5" />
        بازگردانی
      </Button>
      <Button
        type="button"
        size="sm"
        className="gap-1.5"
        disabled={!dirty || isSaving}
        onClick={onSave}
      >
        <Save className="size-3.5" />
        {isSaving ? "در حال ثبت..." : saveLabel}
      </Button>
    </div>
  );
}
