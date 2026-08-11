import { Minus, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { clampQty } from "@/shared/utils/qtyUtils";

/**
 * شمارنده‌ی تعداد با سقف item.expectedQty.
 *
 * field - نام فیلدی که مقدار در آن نگهداری می‌شود
 *         (مثلاً receivedQty در دریافت و shippedQty در ارسال)
 */
export default function QuantityStepper({
  item,
  field,
  onItemChange,
  size = "md",
}) {
  const current = item[field] || 0;
  const dims = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const inputWidth = size === "sm" ? "w-12" : "w-14";

  const handleStep = (delta) => {
    onItemChange(
      item.productId,
      field,
      clampQty(current + delta, item.expectedQty),
    );
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className={`${dims} shrink-0`}
        disabled={current <= 0}
        onClick={() => handleStep(-1)}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="number"
        min={0}
        max={item.expectedQty}
        value={current}
        onChange={(e) =>
          onItemChange(
            item.productId,
            field,
            clampQty(e.target.value, item.expectedQty),
          )
        }
        className={`${dims.split(" ")[0]} ${inputWidth} text-center text-sm px-1`}
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className={`${dims} shrink-0`}
        disabled={current >= item.expectedQty}
        onClick={() => handleStep(1)}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
