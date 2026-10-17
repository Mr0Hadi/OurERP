import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";

import StatusBadge from "@/shared/components/status/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import {
  AUDIT_OPERATION_ICONS,
  AUDIT_OPERATION_LABELS,
  AUDIT_OPERATION_TONES,
  AuditOperationEnum,
} from "../domain/auditEnums";
import { changeTargetOf, entityLabelOf, fieldLabelOf, formatAuditValue } from "../domain/auditVocabulary";

/** ردیفِ ایجاد/حذف کلِ سطر را دارد؛ بقیه‌اش با «نمایش همه» باز می‌شود. */
const COLLAPSED_FIELDS = 6;

function Value({ entityType, field, value, variant }) {
  const { text, kind } = formatAuditValue(entityType, field, value);
  return (
    <span
      dir="auto"
      className={cn(
        "min-w-0 break-words",
        kind !== "value" && "italic text-muted-foreground",
        variant === "old" && "text-muted-foreground line-through decoration-destructive/50",
        variant === "new" && kind === "value" && "font-medium text-foreground",
      )}
    >
      {text}
    </span>
  );
}

/**
 * یک ستون: در ویرایش «قبل ← بعد»، در ایجاد فقط مقدار، در حذف فقط مقدارِ قبلی (خط‌خورده).
 * روی موبایل برچسب بالای مقدار می‌نشیند و قبل/بعد در صورتِ نیاز به خطِ بعد می‌شکنند.
 */
function FieldRow({ entityType, operation, field }) {
  return (
    <div className="grid gap-x-3 gap-y-0.5 py-1.5 sm:grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)]">
      <dt className="text-xs text-muted-foreground" title={field.name}>
        {fieldLabelOf(field.name)}
      </dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        {operation === AuditOperationEnum.UPDATE ? (
          <>
            <Value entityType={entityType} field={field.name} value={field.oldValue} variant="old" />
            <ArrowLeft className="size-3.5 shrink-0 text-muted-foreground" aria-label="به" />
            <Value entityType={entityType} field={field.name} value={field.newValue} variant="new" />
          </>
        ) : operation === AuditOperationEnum.DELETE ? (
          <Value entityType={entityType} field={field.name} value={field.oldValue} variant="old" />
        ) : (
          <Value entityType={entityType} field={field.name} value={field.newValue} />
        )}
      </dd>
    </div>
  );
}

/**
 * یک «تغییر» (یک سطرِ دیتابیس) با ستون‌هایش.
 *
 * @param change     `changes[]`ِ رویداد
 * @param showTarget پیوند به سند/رکوردِ صاحبِ سطر؛ در تاریخچه‌ی خودِ همان سند لازم نیست
 */
export default function AuditChangeCard({ change, showTarget = true }) {
  const [expanded, setExpanded] = useState(false);
  const fields = change.fields ?? [];
  const visible = expanded ? fields : fields.slice(0, COLLAPSED_FIELDS);
  const hidden = fields.length - visible.length;
  const target = showTarget ? changeTargetOf(change) : null;
  const Icon = AUDIT_OPERATION_ICONS[change.operation];

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <StatusBadge tone={AUDIT_OPERATION_TONES[change.operation]} icon={Icon} size="sm" className="h-5">
          {AUDIT_OPERATION_LABELS[change.operation] ?? change.operation}
        </StatusBadge>
        <span className="text-sm font-medium">{entityLabelOf(change.entityType)}</span>
        <span className="font-mono text-xs text-muted-foreground" dir="ltr">
          #{change.entityKey}
        </span>
        {target && (
          <span className="ms-auto text-xs">
            {target.to ? (
              <Link to={target.to} className="text-primary hover:underline">
                {target.label}
              </Link>
            ) : (
              <span className="text-muted-foreground">{target.label}</span>
            )}
          </span>
        )}
      </div>

      {fields.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">ستونی ثبت نشده است.</p>
      ) : (
        <dl className="divide-y divide-border/60 px-3">
          {visible.map((field) => (
            <FieldRow key={field.name} entityType={change.entityType} operation={change.operation} field={field} />
          ))}
        </dl>
      )}

      {(hidden > 0 || expanded) && fields.length > COLLAPSED_FIELDS && (
        <div className="border-t border-border px-1 py-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full gap-1 text-xs text-muted-foreground"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? "نمایش کمتر" : `نمایش همه (${formatNumber(hidden)} ستونِ دیگر)`}
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
      )}
    </div>
  );
}
