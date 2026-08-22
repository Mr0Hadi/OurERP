import { Plus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { RECEIVING_ISSUE_TYPE_LABELS } from "../../domain/receivingVocabulary";

const ISSUE_TYPE_OPTIONS = Object.entries(RECEIVING_ISSUE_TYPE_LABELS);

/**
 * ویرایشگر تفکیک مشکل یک قلم.
 *
 * انباردار مجبور نیست کل کسری را اینجا توضیح دهد. فقط بخشی که واقعاً
 * «مشکل» است (معیوب، اشتباه، آسیب‌دیده و...) را با نوع و تعداد مشخص
 * ثبت می‌کند. باقیمانده به‌طور خودکار «در انتظار محموله بعدی» تلقی
 * می‌شود — نیازی به هیچ اقدامی نیست و خرید همچنان در لیست دریافت
 * می‌ماند تا وقتی بقیه‌اش (مثلاً با کامیون بعدی) برسد.
 */
export default function IssueBreakdownEditor({
  item,
  shortage,
  onAddIssue,
  onUpdateIssue,
  onRemoveIssue,
}) {
  const issues = item.issues || [];
  const allocated = issues.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const remaining = shortage - allocated;

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-card-foreground">
          گزارش مشکل ({shortage.toLocaleString("fa-IR")} عدد کسری)
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => onAddIssue(item.lineId)}
          disabled={remaining <= 0}
        >
          <Plus className="h-3 w-3" />
          افزودن نوع مشکل
        </Button>
      </div>

      {issues.length === 0 && (
        <p className="text-xs text-muted-foreground">
          اگر بخشی از این کسری واقعاً مشکل دارد (نه فقط دیرکرد ارسال)، با «افزودن
          نوع مشکل» ثبتش کنید. در غیر این صورت نیازی به کاری نیست — این خرید
          همچنان در لیست دریافت می‌ماند تا محموله‌ی بعدی برسد.
        </p>
      )}

      {issues.map((issue) => (
        <div
          key={issue.id}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-card rounded-md border border-border p-1.5"
        >
          <Select
            value={issue.issueType}
            onValueChange={(v) =>
              onUpdateIssue(item.lineId, issue.id, "issueType", v)
            }
          >
            <SelectTrigger className="h-8 text-xs sm:w-36 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ISSUE_TYPE_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            min={0}
            value={issue.qty}
            onChange={(e) =>
              onUpdateIssue(item.lineId, issue.id, "qty", e.target.value)
            }
            className="h-8 text-center text-xs sm:w-16 shrink-0"
          />

          <Input
            placeholder="یادداشت (اختیاری)..."
            value={issue.note || ""}
            onChange={(e) =>
              onUpdateIssue(item.lineId, issue.id, "note", e.target.value)
            }
            className="h-8 text-xs flex-1"
          />

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemoveIssue(item.lineId, issue.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {issues.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          گزارش‌شده به‌عنوان مشکل: {allocated.toLocaleString("fa-IR")} از{" "}
          {shortage.toLocaleString("fa-IR")}
          {remaining > 0 && (
            <>
              {" "}
              — {remaining.toLocaleString("fa-IR")} عدد باقی‌مانده در انتظار
              محموله بعدی می‌ماند
            </>
          )}
        </p>
      )}
    </div>
  );
}
