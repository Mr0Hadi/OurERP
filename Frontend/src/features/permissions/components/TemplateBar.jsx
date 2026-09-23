import { ArrowLeftRight, CircleCheck, ListPlus, Sparkles } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";
import { useDepartmentOptionsQuery } from "@/features/organization/departments/services/queries";

import { difference, sameSet } from "./permissionSets";

const toFa = (n) => n.toLocaleString("fa-IR");

/**
 * نوارِ یک‌خطیِ الگو بالای ویرایشگر: الگوی کدام واحد، فاصله‌ی کاربر با آن،
 * و دو دکمه‌ی اعمال.
 *
 * واحدِ الگو قابل انتخاب است (پیش‌فرض: واحدِ خودِ کارمند)، تا ادمین پیش از
 * جابه‌جایی هم بتواند با الگوی مقصد مقایسه کند. `moving` یعنی واحد در فرمِ
 * کارمند عوض شده و هنوز ذخیره نشده — نوار نارنجی می‌شود چون دسترسی‌ها با
 * جابه‌جایی خودکار عوض نمی‌شوند.
 *
 * اعمالِ الگو فقط تیک‌ها را عوض می‌کند؛ چیزی تا «ذخیره» به سرور نمی‌رود.
 */
export default function TemplateBar({
  templateDepartmentId,
  onTemplateDepartmentChange,
  template,
  isLoading,
  moving = false,
  selected,
  locked,
  editable,
  onApply,
}) {
  const { departments } = useDepartmentOptionsQuery();

  const suggested = new Set((template?.permissions ?? []).map((p) => p.permission));
  const missing = difference(suggested, selected);
  const extra = difference(selected, suggested).filter((p) => !locked.has(p));
  const empty = template != null && suggested.size === 0;
  const matches = !empty && missing.length === 0 && extra.length === 0;

  const keptLocked = [...locked].filter((p) => selected.has(p));
  const replaced = new Set([...suggested, ...keptLocked]);
  const merged = new Set([...selected, ...suggested]);

  let status;
  if (templateDepartmentId == null || templateDepartmentId === "") {
    status = "واحدی برای مقایسه انتخاب نشده";
  } else if (isLoading || !template) {
    status = "در حال دریافت الگو...";
  } else if (empty) {
    status = "این واحد هنوز الگو ندارد";
  } else if (matches) {
    status = (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CircleCheck className="size-3.5" />
        مطابق الگو
      </span>
    );
  } else {
    status = [
      missing.length > 0 && `${toFa(missing.length)} مورد کم`,
      extra.length > 0 && `${toFa(extra.length)} مورد اضافه`,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        moving
          ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
          : "border-border bg-muted/30",
      )}
    >
      {moving && template && (
        <p className="mb-1.5 text-xs font-medium text-amber-900 dark:text-amber-200">
          این کارمند به واحد «{template.departmentName}» منتقل می‌شود؛ دسترسی‌ها
          خودکار عوض نمی‌شوند.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Sparkles
          className={cn("size-4 shrink-0", moving ? "text-amber-600" : "text-primary")}
        />
        <span className="text-xs text-muted-foreground">الگوی واحد</span>

        {onTemplateDepartmentChange ? (
          <Select
            value={templateDepartmentId == null ? "" : String(templateDepartmentId)}
            onValueChange={(v) => onTemplateDepartmentChange(Number(v))}
          >
            <SelectTrigger size="sm" className="min-w-28 bg-background">
              <SelectValue placeholder="انتخاب واحد" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm font-medium">
            {template?.departmentName ?? "—"}
          </span>
        )}

        <span className="text-xs text-muted-foreground">{status}</span>

        {editable && template && !empty && !matches && (
          <div className="mr-auto flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              disabled={missing.length === 0}
              onClick={() => onApply(merged)}
            >
              <ListPlus className="size-3.5" />
              افزودن کم‌ها
            </Button>
            <Button
              type="button"
              size="sm"
              variant={moving ? "default" : "secondary"}
              className="h-7 gap-1 px-2 text-xs"
              disabled={sameSet(replaced, selected)}
              onClick={() => onApply(replaced)}
            >
              <ArrowLeftRight className="size-3.5" />
              اعمال کامل الگو
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
