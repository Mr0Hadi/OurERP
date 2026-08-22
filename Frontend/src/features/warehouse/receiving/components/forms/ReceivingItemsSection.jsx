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
import { getRowStatus, ROW_STATUS_CONFIG } from "./receivingRowStatus";
import ReceivingItemRow from "./ReceivingItemRow";
import ReceivingItemCard from "./ReceivingItemCard";

export default function ReceivingItemsSection({
  items,
  title = "اقلام دریافت",
  subtitle,
  onItemChange,
  onAddIssue,
  onUpdateIssue,
  onRemoveIssue,
  onExcessChange,
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
        const received = item.receivedQty || 0;
        const status = getRowStatus(item.expectedQty, received);
        acc.expected += item.expectedQty;
        acc.received += received;
        acc.excess += Number(item.excessQty) || 0;
        acc[status] += 1;
        return acc;
      },
      { expected: 0, received: 0, excess: 0, complete: 0, partial: 0, missing: 0 },
    );
  }, [items]);

  const shortageTotal = totals.expected - totals.received;
  const shortageLabel =
    shortageTotal > 0
      ? `کمبود: ${shortageTotal.toLocaleString("fa-IR")} عدد`
      : "بدون کمبود";

  const rowHandlers = {
    onItemChange,
    onAddIssue,
    onUpdateIssue,
    onRemoveIssue,
    onExcessChange,
  };

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
            className={ROW_STATUS_CONFIG.missing.badgeClass}
          >
            نرسیده: {totals.missing.toLocaleString("fa-IR")}
          </Badge>
          {totals.excess > 0 && (
            <Badge
              variant="outline"
              className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-400"
            >
              اضافه: {totals.excess.toLocaleString("fa-IR")}
            </Badge>
          )}
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
            اطلاعاتی وجود ندارد
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
              <ReceivingItemCard
                key={item.lineId}
                item={item}
                {...rowHandlers}
              />
            ))}

            <div className="rounded-lg bg-muted px-3 py-2.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                جمع کل:{" "}
                <span className="font-bold text-card-foreground tabular-nums">
                  {totals.received.toLocaleString("fa-IR")} /{" "}
                  {totals.expected.toLocaleString("fa-IR")}
                </span>
              </span>
              <span className="text-muted-foreground">{shortageLabel}</span>
            </div>
          </div>
        )}

        {/* ─── نمای جدولی: از sm به بالا ──────────────────────────────── */}
        {filteredItems.length > 0 && (
          <div className="hidden sm:block border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted text-muted-foreground text-xs">
                <tr>
                  <th className="text-right px-3 py-2.5 font-medium">کالا</th>
                  <th className="text-center px-2 py-2.5 font-medium w-20">
                    مورد انتظار
                  </th>
                  <th className="text-center px-2 py-2.5 font-medium w-32">
                    دریافتی
                  </th>
                  <th className="text-center px-2 py-2.5 font-medium w-24">
                    وضعیت
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => (
                  <ReceivingItemRow
                    key={item.lineId}
                    item={item}
                    {...rowHandlers}
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
                    {totals.received.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-2 py-2.5 text-center text-xs text-muted-foreground">
                    {shortageTotal > 0
                      ? `مجموع کمبود: ${shortageTotal.toLocaleString("fa-IR")} عدد`
                      : "بدون کمبود"}
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
