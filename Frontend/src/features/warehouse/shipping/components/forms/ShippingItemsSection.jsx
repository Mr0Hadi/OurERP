// src/features/warehouse/shipping/components/forms/ShippingItemsSection.jsx
import { useMemo, useState } from "react";
import {
  Search,
  Minus,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

function getRowStatus(expectedQty, shippedQty) {
  const qty = shippedQty || 0;
  if (qty <= 0) return "pending";
  if (qty < expectedQty) return "partial";
  return "complete";
}

const ROW_STATUS_CONFIG = {
  complete: {
    label: "کامل",
    icon: CheckCircle2,
    badgeClass:
      "bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800",
    rowClass: "",
  },
  partial: {
    label: "ناقص",
    icon: AlertTriangle,
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
    rowClass: "bg-amber-50/40 dark:bg-amber-950/10",
  },
  pending: {
    label: "آماده‌نشده",
    icon: XCircle,
    badgeClass: "bg-destructive/5 text-destructive border-destructive/20",
    rowClass: "bg-destructive/[0.03]",
  },
};

const clampQty = (value, expectedQty) => {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return 0;
  return Math.min(num, expectedQty);
};

function QuantityStepper({ item, onItemChange, size = "md" }) {
  const shipped = item.shippedQty || 0;
  const dims = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const inputWidth = size === "sm" ? "w-12" : "w-14";

  const handleStep = (delta) => {
    onItemChange(
      item.productId,
      "shippedQty",
      clampQty(shipped + delta, item.expectedQty),
    );
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className={`${dims} shrink-0`}
        disabled={shipped <= 0}
        onClick={() => handleStep(-1)}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="number"
        min={0}
        max={item.expectedQty}
        value={shipped}
        onChange={(e) =>
          onItemChange(
            item.productId,
            "shippedQty",
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
        disabled={shipped >= item.expectedQty}
        onClick={() => handleStep(1)}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ProductThumb({ item }) {
  return item.image ? (
    <img
      src={item.image}
      alt={item.productName}
      className="w-10 h-10 rounded-md object-cover shrink-0 border border-border"
    />
  ) : (
    <div className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center shrink-0">
      <span className="text-[10px] text-muted-foreground">تصویر</span>
    </div>
  );
}

export default function ShippingItemsSection({ items, onItemChange }) {
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
        const shipped = item.shippedQty || 0;
        const status = getRowStatus(item.expectedQty, shipped);
        acc.expected += item.expectedQty;
        acc.shipped += shipped;
        acc[status] += 1;
        return acc;
      },
      { expected: 0, shipped: 0, complete: 0, partial: 0, pending: 0 },
    );
  }, [items]);

  const remainingTotal = totals.expected - totals.shipped;

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold">اقلام ارسال</CardTitle>
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
            {filteredItems.map((item) => {
              const shipped = item.shippedQty || 0;
              const status = getRowStatus(item.expectedQty, shipped);
              const config = ROW_STATUS_CONFIG[status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={item.productId}
                  className={`rounded-lg border border-border p-3 space-y-2.5 ${config.rowClass}`}
                >
                  <div className="flex items-start gap-2.5">
                    <ProductThumb item={item} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-card-foreground text-sm truncate">
                        {item.productName}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5">
                        <span>{item.productCode}</span>
                      </div>
                      {item.note && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.note}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`gap-1 text-xs shrink-0 ${config.badgeClass}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                    <span className="text-xs text-muted-foreground">
                      باقی‌مانده برای ارسال:{" "}
                      <span className="tabular-nums font-medium text-card-foreground">
                        {item.expectedQty.toLocaleString("fa-IR")}
                      </span>
                    </span>
                    <QuantityStepper
                      item={item}
                      onItemChange={onItemChange}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}

            <div className="rounded-lg bg-muted px-3 py-2.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                جمع کل:{" "}
                <span className="font-bold text-card-foreground tabular-nums">
                  {totals.shipped.toLocaleString("fa-IR")} /{" "}
                  {totals.expected.toLocaleString("fa-IR")}
                </span>
              </span>
              <span className="text-muted-foreground">
                {remainingTotal > 0
                  ? `باقی‌مانده: ${remainingTotal.toLocaleString("fa-IR")} عدد`
                  : "ارسال کامل"}
              </span>
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
                {filteredItems.map((item) => {
                  const shipped = item.shippedQty || 0;
                  const status = getRowStatus(item.expectedQty, shipped);
                  const config = ROW_STATUS_CONFIG[status];
                  const StatusIcon = config.icon;

                  return (
                    <tr
                      key={item.productId}
                      className={`hover:bg-accent/30 transition-colors ${config.rowClass}`}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <ProductThumb item={item} />
                          <div className="min-w-0">
                            <div className="font-medium text-card-foreground text-sm truncate">
                              {item.productName}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {item.productCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-2 py-2 text-center tabular-nums">
                        {item.expectedQty.toLocaleString("fa-IR")}
                      </td>

                      <td className="px-2 py-2">
                        <QuantityStepper
                          item={item}
                          onItemChange={onItemChange}
                        />
                      </td>

                      <td className="px-2 py-2">
                        <div className="flex justify-center">
                          <Badge
                            variant="outline"
                            className={`gap-1 text-xs ${config.badgeClass}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                    {remainingTotal > 0
                      ? `باقی‌مانده: ${remainingTotal.toLocaleString("fa-IR")} عدد`
                      : "ارسال کامل"}
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
