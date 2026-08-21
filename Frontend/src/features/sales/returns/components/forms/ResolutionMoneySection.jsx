import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  MONEY_DIRECTIONS,
  MONEY_DIRECTION_LABELS,
  movesRealMoney,
} from "../../domain/returnResolutions";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  REFERENCE_LABELS,
} from "../../domain/returnEffects";

const DIRECTION_OPTIONS = Object.entries(MONEY_DIRECTION_LABELS);
const METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS);

/**
 * بخش پول یک تصمیم.
 *
 * سه حالت در یک لیست: دریافت از مشتری، پرداخت به مشتری، و اعتبار خرید
 * بعدی. فیلدهای بعدی فقط وقتی ظاهر می‌شوند که حالتی انتخاب شده باشد،
 * و روش پرداخت همان واژگانِ صفحه‌ی ثبت فروش است (نقدی / چک / انتقال
 * بانکی) به‌همراه شماره‌ی پیگیریِ متناظرش.
 *
 * اعتبار روش پرداخت ندارد — چون هیچ پولی واقعاً جابه‌جا نمی‌شود.
 */
export default function ResolutionMoneySection({ money, onChange }) {
  const direction = money?.direction ?? MONEY_DIRECTIONS.NONE;
  const method = money?.method ?? PAYMENT_METHODS.CASH;
  const referenceLabel = REFERENCE_LABELS[method];
  const showDetails = direction !== MONEY_DIRECTIONS.NONE;

  return (
    <div className="space-y-2">
      <Select
        value={direction}
        onValueChange={(value) => onChange({ direction: value })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DIRECTION_OPTIONS.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showDetails && (
        <div className="space-y-2 rounded-md border border-border bg-card/60 p-2.5">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              مبلغ (ریال)
            </Label>
            <Input
              type="number"
              dir="ltr"
              min={0}
              value={money.amount ?? ""}
              onChange={(e) => onChange({ amount: e.target.value })}
              placeholder="مبلغ را وارد کنید"
              className="h-8 text-xs input-rtl-placeholder"
            />
          </div>

          {movesRealMoney(direction) && (
            <>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  روش پرداخت
                </Label>
                <Select
                  value={method}
                  onValueChange={(value) =>
                    onChange({ method: value, reference: "" })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHOD_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {referenceLabel && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    {referenceLabel}
                  </Label>
                  <Input
                    dir="ltr"
                    value={money.reference ?? ""}
                    onChange={(e) => onChange({ reference: e.target.value })}
                    placeholder={referenceLabel}
                    className="h-8 text-xs input-rtl-placeholder"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
