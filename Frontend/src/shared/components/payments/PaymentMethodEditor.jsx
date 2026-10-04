import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import AmountInWords from "@/shared/components/forms/AmountInWords";
import {
  PAYMENT_REFERENCE_FIELDS,
  PAYMENT_TYPE_LABELS,
  PaymentTypeEnum,
} from "@/shared/domain/enums/paymentType";
import {
  ROW_PAYMENT_TYPES,
  addMixedRow,
  materializeRows,
  methodOf,
  removeMixedRow,
  resolvedRows,
  rowsTotal,
  switchMethod,
  updateRow,
} from "@/shared/domain/payments/paymentSplit";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * روش و مبلغِ یک پرداخت (فرمِ «ثبت پرداخت»ِ `PaymentsCard`): نقدی، انتقال بانکی،
 * چک یا **ترکیبی** — یعنی مبلغ بینِ چند روش تقسیم شود و هر تکه مرجعِ خودش را
 * داشته باشد.
 *
 * مبلغ با باقیمانده پیش‌پر است (`payable`)؛ در ترکیبی آخرین تکه خودکار
 * «باقیمانده» را می‌گیرد.
 *
 * کنترل‌شده: `value` شکلِ `{ method, rows }` (`shared/domain/payments/paymentSplit`).
 *
 * @param methods روش‌های قابل‌انتخاب (اصلاح و پول برگشتی: بدونِ ترکیبی)
 */
export default function PaymentMethodEditor({
  value,
  onChange,
  payable,
  methods = [...ROW_PAYMENT_TYPES, PaymentTypeEnum.MIXED],
  error,
}) {
  const method = methodOf(value);
  const rows = resolvedRows(value, payable);
  // ویرایشِ ردیف روی همان ردیف‌هایی است که دیده می‌شوند (حتی ردیفِ پیش‌فرضِ ذخیره‌نشده).
  const editable = materializeRows(value, payable);
  const change = (id, patch) => onChange(updateRow(editable, id, patch));

  return (
    <div className="@container/pay space-y-3">
      {methods.length > 1 && (
        <StatusChoice
          label="روش پرداخت"
          options={methods.map((candidate) => ({ value: candidate, label: PAYMENT_TYPE_LABELS[candidate] }))}
          value={method}
          onChange={(next) => onChange(switchMethod(value, next))}
        />
      )}

      {method === PaymentTypeEnum.MIXED ? (
        <MixedRows
          rows={rows}
          payable={payable}
          onChange={change}
          onAdd={() => onChange(addMixedRow(editable, payable))}
          onRemove={(id) => onChange(removeMixedRow(editable, id))}
        />
      ) : (
        <SingleRow row={rows[0]} payable={payable} onChange={(patch) => change(rows[0].id, patch)} />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** روشِ تکی: مبلغ، تاریخ و (برای چک/انتقال) شماره‌ی پیگیری. */
function SingleRow({ row, payable, onChange }) {
  const reference = PAYMENT_REFERENCE_FIELDS[row.type];
  const full = Math.max(0, Number(payable) || 0);
  return (
    <div className="grid gap-3 @md/pay:grid-cols-2">
      <div className="space-y-1.5 @md/pay:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">مبلغ (ریال)</Label>
          {row.auto ? (
            <span className="text-[11px] text-muted-foreground">کلِ مانده</span>
          ) : (
            row.amount !== full && (
              <button
                type="button"
                className="text-[11px] font-medium text-primary hover:underline"
                onClick={() => onChange({ amount: null })}
              >
                کلِ مانده ({formatNumber(full)})
              </button>
            )
          )}
        </div>
        <PriceInput
          min={0}
          value={row.amount}
          onValueChange={(next) => onChange({ amount: next ?? 0 })}
          className="h-9 tabular-nums"
        />
        <AmountInWords rial={row.amount} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">تاریخ پرداخت</Label>
        <PersianDatePicker
          value={row.paidAt || ""}
          onChange={(isoDate) => onChange({ paidAt: isoDate || "" })}
          placeholder="امروز"
        />
      </div>
      {reference && (
        <div className="space-y-1.5">
          <Label className="text-xs">{reference.label}</Label>
          <Input
            dir="ltr"
            value={row[reference.field] || ""}
            onChange={(e) => onChange({ [reference.field]: e.target.value })}
            className="h-9"
          />
        </div>
      )}
    </div>
  );
}

/** ترکیبی: هر تکه روش، مبلغ، مرجع و تاریخِ خودش؛ آخرین تکه «باقیمانده». */
function MixedRows({ rows, payable, onChange, onAdd, onRemove }) {
  const total = rowsTotal(rows);
  const rest = (Number(payable) || 0) - total;

  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {rows.map((row, index) => {
          const reference = PAYMENT_REFERENCE_FIELDS[row.type];
          return (
            <li key={row.id} className="rounded-lg border border-border bg-muted/20 p-2.5">
              <div className="grid grid-cols-[1fr_auto] gap-2 @lg/pay:grid-cols-[9rem_1fr_auto]">
                <Select
                  value={String(row.type)}
                  onValueChange={(next) => onChange(row.id, { type: Number(next) })}
                >
                  <SelectTrigger className="h-9! w-full" aria-label={`روشِ تکه‌ی ${formatNumber(index + 1)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROW_PAYMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={String(type)}>
                        {PAYMENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive @lg/pay:order-last"
                  aria-label="حذفِ این تکه"
                  onClick={() => onRemove(row.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
                <div className="relative col-span-2 @lg/pay:col-span-1">
                  <PriceInput
                    min={0}
                    value={row.amount}
                    onValueChange={(next) => onChange(row.id, { amount: next ?? 0 })}
                    aria-label="مبلغ (ریال)"
                    className={cn("h-9 tabular-nums", row.auto && "pl-20")}
                  />
                  {row.auto && (
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                      باقیمانده
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 grid gap-2 @md/pay:grid-cols-2">
                {reference && (
                  <Input
                    dir="ltr"
                    placeholder={reference.label}
                    aria-label={reference.label}
                    value={row[reference.field] || ""}
                    onChange={(e) => onChange(row.id, { [reference.field]: e.target.value })}
                    className="input-rtl-placeholder h-9"
                  />
                )}
                <PersianDatePicker
                  value={row.paidAt || ""}
                  onChange={(isoDate) => onChange(row.id, { paidAt: isoDate || "" })}
                  placeholder="تاریخ: امروز"
                />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
          <Plus className="size-3.5" />
          افزودنِ روشِ دیگر
        </Button>
        <p className="text-xs text-muted-foreground tabular-nums">
          جمع: <span className="font-semibold text-card-foreground">{formatRial(total)}</span>
          {rest !== 0 && (
            <span className={cn("ms-2", toneText(rest > 0 ? "warning" : "danger"))}>
              {rest > 0 ? `مانده ${formatNumber(rest)}` : `${formatNumber(-rest)} بیشتر`}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
