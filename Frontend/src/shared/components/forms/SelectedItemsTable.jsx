import { Trash2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { PriceInput } from "@/shared/components/ui/price-input";

export default function SelectedItemsTable({
  items,
  onFieldChange,
  onRemove,
  lineTotal,
  grandTotal,
}) {
  return (
    <div className="hidden md:block border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm table-fixed">
        <thead className="bg-muted text-muted-foreground text-xs">
          <tr>
            <th className="text-right px-3 py-2.5 font-medium">کالا</th>
            <th className="text-center px-2 py-2.5 font-medium w-20">
              تعداد
            </th>
            <th className="text-center px-2 py-2.5 font-medium w-28">
              قیمت واحد
            </th>
            <th className="text-center px-2 py-2.5 font-medium w-20">
              تخفیف %
            </th>
            <th className="text-center px-2 py-2.5 font-medium w-28">
              جمع
            </th>
            <th className="w-8 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr
              key={item.productId}
              className="hover:bg-accent/30 transition-colors"
            >
              <td className="px-3 py-2">
                <p className="font-medium text-card-foreground text-sm truncate">
                  {item.productName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.productCode}
                </p>
              </td>
              <td className="px-2 py-2">
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    onFieldChange(item.productId, "quantity", e.target.value)
                  }
                  className="h-7 text-center text-xs w-full"
                />
              </td>
              <td className="px-2 py-2">
                <PriceInput
                  min={0}
                  value={item.unitPrice === "" || item.unitPrice == null ? null : Number(item.unitPrice)}
                  onValueChange={(next) =>
                    onFieldChange(item.productId, "unitPrice", next ?? "")
                  }
                  className="h-7 text-center text-xs w-full"
                />
              </td>
              <td className="px-2 py-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={item.discount}
                  onChange={(e) =>
                    onFieldChange(item.productId, "discount", e.target.value)
                  }
                  className="h-7 text-center text-xs w-full"
                />
              </td>
              <td className="px-2 py-2 text-center text-xs font-medium text-card-foreground">
                {lineTotal(item).toLocaleString("fa-IR")}
              </td>
              <td className="px-2 py-2 text-center">
                <button
                  type="button"
                  onClick={() => onRemove(item.productId)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded"
                  aria-label="حذف کالا"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-muted border-t border-border">
          <tr>
            <td
              colSpan={4}
              className="px-3 py-2.5 text-sm font-medium text-muted-foreground text-right"
            >
              جمع کل اقلام:
            </td>
            <td className="px-2 py-2.5 text-center text-sm font-bold text-card-foreground">
              {grandTotal.toLocaleString("fa-IR")}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
