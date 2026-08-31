import { Trash2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { PriceInput } from "@/shared/components/ui/price-input";

export default function SelectedItemsCards({
  items,
  onFieldChange,
  onRemove,
  lineTotal,
  grandTotal,
}) {
  return (
    <div className="md:hidden space-y-2">
      {items.map((item) => (
        <div
          key={item.productId}
          className="border border-border rounded-lg p-3 bg-card space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-card-foreground text-sm truncate">
                {item.productName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.productCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.productId)}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded shrink-0"
              aria-label="حذف کالا"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">
                تعداد
              </label>
              <Input
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) =>
                  onFieldChange(item.productId, "qty", e.target.value)
                }
                className="h-8 text-center text-xs w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">
                قیمت واحد
              </label>
              <PriceInput
                min={0}
                value={item.unitPrice === "" || item.unitPrice == null ? null : Number(item.unitPrice)}
                onValueChange={(next) =>
                  onFieldChange(item.productId, "unitPrice", next ?? "")
                }
                className="h-8 text-center text-xs w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">
                تخفیف %
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={item.discount}
                onChange={(e) =>
                  onFieldChange(item.productId, "discount", e.target.value)
                }
                className="h-8 text-center text-xs w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">جمع</span>
            <span className="text-sm font-bold text-card-foreground">
              {lineTotal(item).toLocaleString("fa-IR")}
            </span>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 border border-border">
        <span className="text-sm font-medium text-muted-foreground">
          جمع کل اقلام:
        </span>
        <span className="text-sm font-bold text-card-foreground">
          {grandTotal.toLocaleString("fa-IR")}
        </span>
      </div>
    </div>
  );
}
