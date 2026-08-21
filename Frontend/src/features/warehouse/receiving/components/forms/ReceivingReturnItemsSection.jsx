import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  RETURN_PROBLEM_LABELS,
  RETURN_PROBLEM_STYLES,
} from "@/features/sales/returns/domain/returnVocabulary";

const PROBLEM_OPTIONS = Object.entries(RETURN_PROBLEM_LABELS);

function IntakeLine({ line, onChange }) {
  const qty = Number(line.qtyThisRound) || 0;
  const healthy = Number(line.healthyQtyThisRound) || 0;
  const damaged = Math.max(0, qty - healthy);

  return (
    <div className="border border-border rounded-lg p-3 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-card-foreground text-sm truncate">
            {line.productName}
          </p>
          <p className="text-xs text-muted-foreground">{line.productCode}</p>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums shrink-0 text-left">
          <div>
            باقیمانده‌ی این تصمیم:{" "}
            <span className="font-medium text-card-foreground">
              {line.remainingQty.toLocaleString("fa-IR")} {line.unit}
            </span>
          </div>
          {line.doneQty > 0 && (
            <div className="text-[11px] opacity-70">
              قبلاً دریافت‌شده: {line.doneQty.toLocaleString("fa-IR")}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={`text-[10px] ${RETURN_PROBLEM_STYLES[line.problem] ?? ""}`}
        >
          ادعای مشتری: {RETURN_PROBLEM_LABELS[line.problem] ?? line.problem}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            چقدر تحویل گرفتید؟
          </Label>
          <Input
            type="number"
            min={0}
            max={line.remainingQty}
            value={line.qtyThisRound}
            onChange={(e) =>
              onChange(line.effectId, "qtyThisRound", e.target.value)
            }
            className="h-8 text-xs text-center"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            چقدرش سالم و قابل فروش دوباره است؟
          </Label>
          <Input
            type="number"
            min={0}
            max={qty}
            value={line.healthyQtyThisRound}
            onChange={(e) =>
              onChange(line.effectId, "healthyQtyThisRound", e.target.value)
            }
            className="h-8 text-xs text-center"
          />
        </div>
      </div>

      {damaged > 0 && (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20 p-2">
          <p className="text-[11px] text-amber-800 dark:text-amber-300">
            {damaged.toLocaleString("fa-IR")} عدد سالم نیست — دریافت می‌شود و
            ادعا را می‌بندد، ولی وارد موجودی قابل‌فروش نمی‌شود.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <Select
              value={line.issueProblem || ""}
              onValueChange={(value) =>
                onChange(line.effectId, "issueProblem", value)
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="آنچه شما دیدید..." />
              </SelectTrigger>
              <SelectContent>
                {PROBLEM_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={line.issueNote || ""}
              onChange={(e) =>
                onChange(line.effectId, "issueNote", e.target.value)
              }
              placeholder="توضیح (اختیاری)..."
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * اقلامی که انبار باید در این مرجوعی تحویل بگیرد.
 *
 * فهرست از اثرهای معلقِ «پس‌گرفتن کالا» می‌آید، نه از ادعای مشتری —
 * یعنی انباردار فقط چیزی را می‌بیند که واحد فروش واقعاً تصمیم گرفته پس
 * گرفته شود.
 */
export default function ReceivingReturnItemsSection({ lines, onLineChange }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          کالاهایی که باید تحویل گرفته شوند
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          می‌توانید بخشی را همین حالا ثبت کنید و باقی را هر وقت رسید — این
          مرجوعی تا تحویل کامل، در صف دریافت باقی می‌ماند.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {lines.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6 border border-dashed border-border rounded-lg">
            برای این مرجوعی کالایی در انتظار تحویل نیست
          </p>
        ) : (
          lines.map((line) => (
            <IntakeLine
              key={line.effectId}
              line={line}
              onChange={onLineChange}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
