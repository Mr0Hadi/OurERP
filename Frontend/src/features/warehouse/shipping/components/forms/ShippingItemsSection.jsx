import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { getRowStatus, ROW_STATUS_CONFIG } from "./shippingRowStatus";
import ShippingItemRow from "./ShippingItemRow";
import ShippingItemCard from "./ShippingItemCard";

export default function ShippingItemsSection({
  items,
  onItemChange,
  title = "اقلام ارسال",
  subtitle,
}) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.productName?.toLowerCase().includes(term) ||
        item.productCode?.toLowerCase().includes(term),
    );
  }, [items, search]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const shipped = item.shippedQuantity || 0;
        const status = getRowStatus(item.expectedQuantity, shipped);
        acc.expected += item.expectedQuantity;
        acc.shipped += shipped;
        acc[status] += 1;
        return acc;
      },
      { expected: 0, shipped: 0, complete: 0, partial: 0, pending: 0 },
    );
  }, [items]);

  const remainingTotal = totals.expected - totals.shipped;
  const remainingLabel =
    remainingTotal > 0
      ? `باقی‌مانده: ${remainingTotal.toLocaleString("fa-IR")} عدد`
      : "ارسال کامل";

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge
            variant="outline"
            className={ROW_STATUS_CONFIG.complete.badgeClass}
          >
            کامل: {totals.complete.toLocaleString("fa-IR")}
          </Badge>
          <Badge
            variant="outline"
            className={ROW_STATUS_CONFIG.partial.badgeClass}
          >
            ناقص: {totals.partial.toLocaleString("fa-IR")}
          </Badge>
          <Badge
            variant="outline"
            className={ROW_STATUS_CONFIG.pending.badgeClass}
          >
            آماده‌نشده: {totals.pending.toLocaleString("fa-IR")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.length > 0 && (
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="جست‌وجو بر اساس نام یا کد کالا..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8 text-sm h-9 input-rtl-placeholder"
            />
          </div>
        )}

        {items.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            این فروش دیگر قلمی برای ارسال ندارد
          </p>
        )}

        {items.length > 0 && filteredItems.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            کالایی با این مشخصات یافت نشد
          </p>
        )}

        {/* ─── نمای کارتی: موبایل ─────────────────────────────────────── */}
        {filteredItems.length > 0 && (
          <div className="space-y-2 sm:hidden">
            {filteredItems.map((item) => (
              <ShippingItemCard
                key={item.lineId}
                item={item}
                onItemChange={onItemChange}
              />
            ))}

            <div className="rounded-lg bg-muted px-3 py-2.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                جمع کل:{" "}
                <span className="font-bold text-card-foreground tabular-nums">
                  {totals.shipped.toLocaleString("fa-IR")} /{" "}
                  {totals.expected.toLocaleString("fa-IR")}
                </span>
              </span>
              <span className="text-muted-foreground">{remainingLabel}</span>
            </div>
          </div>
        )}

        {/* ─── نمای جدولی: از sm به بالا ──────────────────────────────── */}
        {filteredItems.length > 0 && (
          <div className="hidden sm:block border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-muted text-muted-foreground text-xs">
                <tr>
                  <th className="text-right px-3 py-2.5 font-medium">کالا</th>
                  <th className="text-center px-2 py-2.5 font-medium w-24">
                    باقی‌مانده برای ارسال
                  </th>
                  <th className="text-center px-2 py-2.5 font-medium w-32">
                    ارسالی این دور
                  </th>
                  <th className="text-center px-2 py-2.5 font-medium w-24">
                    وضعیت
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => (
                  <ShippingItemRow
                    key={item.lineId}
                    item={item}
                    onItemChange={onItemChange}
                  />
                ))}
              </tbody>

              <tfoot className="bg-muted border-t border-border">
                <tr>
                  <td className="px-3 py-2.5 text-sm font-medium text-muted-foreground text-right">
                    جمع کل:
                  </td>
                  <td className="px-2 py-2.5 text-center text-sm font-bold text-card-foreground tabular-nums">
                    {totals.expected.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-2 py-2.5 text-center text-sm font-bold text-card-foreground tabular-nums">
                    {totals.shipped.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-2 py-2.5 text-center text-xs text-muted-foreground">
                    {remainingLabel}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
