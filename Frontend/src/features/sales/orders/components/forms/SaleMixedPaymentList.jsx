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

const MIXED_PAYMENT_TYPES = [
  { value: "cash", label: "نقدی" },
  { value: "check", label: "چک" },
  { value: "transfer", label: "انتقال بانکی" },
];

/**
 * برخلاف نسخه‌ی خرید، پرداخت‌های ترکیبی فروش شناسه ندارند و با اندیس
 * آرایه شناسایی می‌شوند؛ به همین دلیل این کامپوننت محلی مانده است.
 */
export default function SaleMixedPaymentList({
  mixedPayments,
  onAdd,
  onRemove,
  onChange,
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-card-foreground text-sm font-medium">
          پرداخت‌های ترکیبی
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="h-8 gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          افزودن پرداخت
        </Button>
      </div>

      {mixedPayments.map((payment, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-border bg-card p-3 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-card-foreground">
              پرداخت {idx + 1}
            </span>
            {mixedPayments.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(idx)}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* نوع پرداخت */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">نوع</Label>
            <Select
              value={payment.type}
              onValueChange={(val) => onChange(idx, "type", val)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MIXED_PAYMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* مبلغ */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">مبلغ (ریال)</Label>
            <Input
              type="number"
              dir="ltr"
              min={0}
              placeholder="مبلغ"
              value={payment.amount || ""}
              onChange={(e) => onChange(idx, "amount", e.target.value)}
              className="h-9 input-rtl-placeholder"
            />
          </div>

          {/* شماره چک */}
          {payment.type === "check" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">شماره چک</Label>
              <Input
                placeholder="شماره چک"
                value={payment.checkNumber || ""}
                onChange={(e) => onChange(idx, "checkNumber", e.target.value)}
                className="h-9 input-rtl-placeholder"
                dir="ltr"
              />
            </div>
          )}

          {/* شماره پیگیری */}
          {payment.type === "transfer" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                شماره پیگیری
              </Label>
              <Input
                placeholder="شماره پیگیری"
                value={payment.transferRef || ""}
                onChange={(e) => onChange(idx, "transferRef", e.target.value)}
                className="h-9 input-rtl-placeholder"
                dir="ltr"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
