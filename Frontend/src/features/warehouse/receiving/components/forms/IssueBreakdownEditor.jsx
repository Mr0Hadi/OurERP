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
import {
  isObservationLine,
  issueTypesFor,
} from "../../domain/issueSemantics";

/**
 * ویرایشگر تفکیک مشکل یک قلم.
 *
 * یک کامپوننت، دو معنا — که با منبعِ خط تعیین می‌شود:
 *
 *  • خط سفارش: انباردار مجبور نیست کل کسری را توضیح دهد؛ فقط بخشی که
 *    واقعاً «مشکل» است را با نوع و تعداد ثبت می‌کند و باقیمانده
 *    خودکار «در انتظار محموله بعدی» تلقی می‌شود.
 *
 *  • خط مرجوعی: کالا برگشته و اینجا انباردار *مشاهده‌ی خودش* را ثبت
 *    می‌کند — چند تا از کالای برگشتی معیوب یا آسیب‌دیده بود. باقیمانده
 *    یعنی سالم است و به موجودی قابل‌فروش برمی‌گردد.
 *
 * همین مشاهده‌ها روی اثرِ مرجوعی می‌نشینند و کنارِ ادعای طرف حساب نگه
 * داشته می‌شوند، چون هر کدام یک مقصرِ متفاوت را نشان می‌دهند.
 */
export default function IssueBreakdownEditor({
  item,
  budget,
  onAddIssue,
  onUpdateIssue,
  onRemoveIssue,
}) {
  const issues = item.issues || [];
  const allocated = issues.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const remaining = budget - allocated;
  const isObservation = isObservationLine(item);
  const typeOptions = issueTypesFor(item);

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-card-foreground">
          {isObservation ? "بازرسی کالای برگشتی" : "گزارش مشکل"} (
          {budget.toLocaleString("fa-IR")} عدد{" "}
          {isObservation ? "دریافت‌شده" : "کسری"})
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
          {isObservation
            ? "اگر بخشی از کالای برگشتی معیوب یا آسیب‌دیده است، با «افزودن نوع مشکل» ثبتش کنید. باقیمانده سالم فرض می‌شود و به موجودی قابل‌فروش برمی‌گردد."
            : "اگر بخشی از این کسری واقعاً مشکل دارد (نه فقط دیرکرد ارسال)، با «افزودن نوع مشکل» ثبتش کنید. در غیر این صورت نیازی به کاری نیست — این خرید همچنان در لیست دریافت می‌ماند تا محموله‌ی بعدی برسد."}
        </p>
      )}

      {issues.map((issue) => (
        <div
          key={issue.id}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-card rounded-md border border-border p-1.5"
        >
          {/* issueType از فضای عددیِ RETURN_PROBLEMS می‌آید؛ Radix رشته
              می‌خواهد و رشته برمی‌گرداند. */}
          <Select
            value={issue.issueType == null ? "" : String(issue.issueType)}
            onValueChange={(v) =>
              onUpdateIssue(item.lineId, issue.id, "issueType", Number(v))
            }
          >
            <SelectTrigger className="h-8 text-xs sm:w-36 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {RECEIVING_ISSUE_TYPE_LABELS[value] ?? value}
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
          {budget.toLocaleString("fa-IR")}
          {remaining > 0 && (
            <>
              {" "}
              — {remaining.toLocaleString("fa-IR")} عدد باقی‌مانده{" "}
              {isObservation
                ? "سالم در نظر گرفته می‌شود"
                : "در انتظار محموله بعدی می‌ماند"}
            </>
          )}
        </p>
      )}
    </div>
  );
}
