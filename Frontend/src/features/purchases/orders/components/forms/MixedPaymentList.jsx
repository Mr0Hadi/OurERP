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

export default function MixedPaymentList({
  mixedPayments,
  onAdd,
  onRemove,
  onChange,
  errors,
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-card-foreground text-sm font-medium">
          روش‌های پرداخت
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="gap-1 h-8"
        >
          <Plus className="h-3.5 w-3.5" />
          افزودن روش پرداخت
        </Button>
      </div>

      {mixedPayments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
          هیچ روش پرداختی اضافه نشده است
        </div>
      )}

      {mixedPayments.map((payment, index) => (
        <div
          key={payment.id}
          className="border border-border rounded-lg p-3 space-y-3 bg-card"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-card-foreground">
              پرداخت {index + 1}
            </span>
            {mixedPayments.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(payment.id)}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* نوع روش پرداخت */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              روش پرداخت
            </Label>
            <Select
              value={payment.type}
              onValueChange={(val) => onChange(payment.id, "type", val)}
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
            <Label className="text-xs text-muted-foreground">
              مبلغ (ریال)
            </Label>
            <Input
              type="number"
              dir="ltr"
              min={0}
              placeholder="صفر"
              value={payment.amount || ""}
              onChange={(e) => onChange(payment.id, "amount", e.target.value)}
              className="h-9 input-rtl-placeholder"
            />
          </div>

          {/* شماره چک */}
          {payment.type === "check" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                شماره چک
              </Label>
              <Input
                placeholder="شماره چک"
                value={payment.checkNumber || ""}
                onChange={(e) =>
                  onChange(payment.id, "checkNumber", e.target.value)
                }
                className="input-rtl-placeholder h-9"
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
                onChange={(e) =>
                  onChange(payment.id, "transferRef", e.target.value)
                }
                className="input-rtl-placeholder h-9"
                dir="ltr"
              />
            </div>
          )}
        </div>
      ))}

      {errors?.mixedPayments && (
        <p className="text-xs text-destructive">{errors.mixedPayments}</p>
      )}
    </div>
  );
}
