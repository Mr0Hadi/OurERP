import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const TYPES = [
  { value: "cash", label: "نقدی" },
  { value: "check", label: "چک" },
  { value: "transfer", label: "انتقال بانکی" },
];

const REFERENCE_FIELD = {
  check: { field: "checkNumber", label: "شماره چک" },
  transfer: { field: "transferRef", label: "شماره پیگیری" },
};

/**
 * تقسیم یک مبلغ بین چند روش پرداخت.
 *
 * هم فرم ثبت فروش از این استفاده می‌کند و هم بخش پولِ تصمیمِ مرجوعی —
 * قبلاً دو نسخه‌ی جدا با همین رفتار وجود داشت. ردیف‌ها با اندیس آرایه
 * شناخته می‌شوند، پس مصرف‌کننده لازم نیست id تولید کند.
 *
 * dense برای جایی است که این لیست داخل یک فرمِ فشرده می‌نشیند (مثل
 * کامپوزرِ تصمیم) و باید ارتفاع کمتری بگیرد.
 */
export default function MixedPaymentList({
  payments = [],
  onAdd,
  onRemove,
  onChange,
  title = "پرداخت‌های ترکیبی",
  dense = false,
}) {
  const inputHeight = dense ? "h-8 text-xs" : "h-9";
  const labelClass = dense
    ? "text-[11px] text-muted-foreground"
    : "text-xs text-muted-foreground";

  const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className={dense ? "space-y-2" : "space-y-3"}>
      <div className="flex justify-between items-center gap-2">
        <Label
          className={
            dense
              ? "text-[11px] text-muted-foreground"
              : "text-card-foreground text-sm font-medium"
          }
        >
          {title}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="h-8 gap-1 text-xs shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          افزودن
        </Button>
      </div>

      {payments.map((payment, idx) => {
        const reference = REFERENCE_FIELD[payment.type];
        return (
          <div
            key={idx}
            className="rounded-lg border border-border bg-card p-2.5 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-card-foreground">
                پرداخت {(idx + 1).toLocaleString("fa-IR")}
              </span>
              {payments.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(idx)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className={labelClass}>روش</Label>
                <Select
                  value={payment.type}
                  onValueChange={(val) => onChange(idx, "type", val)}
                >
                  <SelectTrigger className={inputHeight}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className={labelClass}>مبلغ (ریال)</Label>
                <Input
                  type="number"
                  dir="ltr"
                  min={0}
                  placeholder="مبلغ"
                  value={payment.amount || ""}
                  onChange={(e) => onChange(idx, "amount", e.target.value)}
                  className={`${inputHeight} input-rtl-placeholder`}
                />
              </div>
            </div>

            {reference && (
              <div className="space-y-1">
                <Label className={labelClass}>{reference.label}</Label>
                <Input
                  dir="ltr"
                  placeholder={reference.label}
                  value={payment[reference.field] || ""}
                  onChange={(e) =>
                    onChange(idx, reference.field, e.target.value)
                  }
                  className={`${inputHeight} input-rtl-placeholder`}
                />
              </div>
            )}
          </div>
        );
      })}

      {payments.length > 0 && (
        <div className="flex items-center justify-between rounded-md bg-muted px-2.5 py-2 text-xs">
          <span className="text-muted-foreground">جمع ردیف‌ها</span>
          <span className="font-bold tabular-nums text-card-foreground">
            {total.toLocaleString("fa-IR")} ریال
          </span>
        </div>
      )}
    </div>
  );
}
