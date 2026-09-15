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
import ShippingItemCard from "./ShippingItemCard";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * اقلامِ یک دورِ ارسال. کارت است نه ردیفِ جدول، چون اسکنِ دانه‌ها و
 * مازاد داخلِ همان قلم جا می‌گیرند.
 */
export default function ShippingItemsSection({
  items,
  isTracked,
  title = "اقلام ارسال",
  subtitle,
  // مازاد فقط برای فروشِ ارسال ناقص / ارسال شده / تحویل کامل.
  allowExcess = false,
  ...handlers
}) {
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  // قلمِ کامل‌ارسال‌شده فقط برای ثبتِ مازادِ دیرتر کشف‌شده لازم است؛ اگر
  // همیشه دیده شود، در فروشِ پرقلم قلمِ واقعاً منتظر زیرشان گم می‌شود.
  const isPendingOrTouched = (item) =>
    item.remainingQuantity > 0 ||
    (Number(item.excessQuantity) || 0) > 0 ||
    item.productUnitBarcodes.length > 0;
  const completedCount = items.filter((item) => !isPendingOrTouched(item)).length;

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const visible =
      showCompleted || term
        ? items
        : items.filter(
            (item) =>
              item.remainingQuantity > 0 ||
              (Number(item.excessQuantity) || 0) > 0 ||
              item.productUnitBarcodes.length > 0,
          );
    if (!term) return visible;
    return visible.filter((item) => item.productName?.toLowerCase().includes(term));
  }, [items, search, showCompleted]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          if (item.remainingQuantity <= 0) return acc;
          acc[getRowStatus(item.remainingQuantity, item.shippedQuantity)] += 1;
          return acc;
        },
        { complete: 0, partial: 0, pending: 0 },
      ),
    [items],
  );

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
          <Badge variant="outline" className={ROW_STATUS_CONFIG.complete.badgeClass}>
            کامل: {fa(totals.complete)}
          </Badge>
          <Badge variant="outline" className={ROW_STATUS_CONFIG.partial.badgeClass}>
            ناقص: {fa(totals.partial)}
          </Badge>
          <Badge variant="outline" className={ROW_STATUS_CONFIG.pending.badgeClass}>
            آماده‌نشده: {fa(totals.pending)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.length > 1 && (
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="جست‌وجو بر اساس نام کالا..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8 text-sm h-9 input-rtl-placeholder"
            />
          </div>
        )}

        {items.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            این فروش قلمی ندارد
          </p>
        )}

        {items.length > 0 && filteredItems.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            {search.trim()
              ? "کالایی با این مشخصات یافت نشد"
              : "همه‌ی اقلام این فروش کامل ارسال شده‌اند"}
          </p>
        )}

        {filteredItems.map((item) => (
          <ShippingItemCard
            key={item.saleItemId}
            item={item}
            isTracked={isTracked(item.productId)}
            allowExcess={allowExcess}
            {...handlers}
          />
        ))}

        {allowExcess && completedCount > 0 && !search.trim() && (
          <button
            type="button"
            className="w-full rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-card-foreground"
            onClick={() => setShowCompleted((open) => !open)}
          >
            {showCompleted
              ? "پنهان‌کردن اقلامِ کامل‌ارسال‌شده"
              : `نمایش ${fa(completedCount)} قلمِ کامل‌ارسال‌شده (برای ثبتِ ارسالِ بیش از سفارش)`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
