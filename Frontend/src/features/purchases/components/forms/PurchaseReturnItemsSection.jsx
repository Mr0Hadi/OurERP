// src/features/purchases/components/forms/PurchaseReturnItemsSection.jsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { PURCHASE_RETURN_REASON_LABELS } from "../../services/returns/mockData";

const REASON_OPTIONS = Object.entries(PURCHASE_RETURN_REASON_LABELS);

export default function PurchaseReturnItemsSection({ items, onItemChange }) {
  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc.qty += item.qty || 0;
          acc.amount += (item.qty || 0) * item.unitPrice;
          return acc;
        },
        { qty: 0, amount: 0 },
      ),
    [items],
  );

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground">
            اقلام مرجوعی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground py-6 border border-dashed border-border rounded-lg">
            ابتدا یک خرید انتخاب کنید
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اقلام مرجوعی
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* نسخه دسکتاپ: جدول */}
        <div className="hidden md:block border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-muted text-muted-foreground text-xs">
              <tr>
                <th className="text-right px-3 py-2.5 font-medium">کالا</th>
                <th className="text-center px-2 py-2.5 font-medium w-20">سفارش‌شده</th>
                <th className="text-center px-2 py-2.5 font-medium w-24">مرجوعی</th>
                <th className="text-center px-2 py-2.5 font-medium w-32">دلیل</th>
                <th className="text-right px-2 py-2.5 font-medium w-40">توضیح</th>
                <th className="text-center px-2 py-2.5 font-medium w-24">جمع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.productId} className={item.qty > 0 ? "bg-primary/[0.03]" : ""}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-card-foreground text-sm truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.productCode}
                      {item.alreadyReturnedQty > 0 && (
                        <span className="text-amber-600 dark:text-amber-400">
                          {" "}
                          | قبلاً مرجوع شده: {item.alreadyReturnedQty.toLocaleString("fa-IR")}
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">
                    {item.orderedQty.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      max={item.maxReturnableQty}
                      value={item.qty}
                      onChange={(e) => onItemChange(item.productId, "qty", e.target.value)}
                      className="h-8 text-center text-xs w-full"
                    />
                    <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                      حداکثر {item.maxReturnableQty.toLocaleString("fa-IR")}
                    </p>
                  </td>
                  <td className="px-2 py-2">
                    <Select
                      value={item.reason}
                      onValueChange={(v) => onItemChange(item.productId, "reason", v)}
                      disabled={item.qty === 0}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REASON_OPTIONS.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-2">
                    <Textarea
                      placeholder="توضیح اختیاری..."
                      value={item.note || ""}
                      onChange={(e) => onItemChange(item.productId, "note", e.target.value)}
                      rows={1}
                      disabled={item.qty === 0}
                      className="resize-none text-xs h-8"
                    />
                  </td>
                  <td className="px-2 py-2 text-center text-xs font-medium text-card-foreground">
                    {(item.qty * item.unitPrice).toLocaleString("fa-IR")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted border-t border-border">
              <tr>
                <td colSpan={4} className="px-3 py-2.5 text-sm font-medium text-muted-foreground text-right">
                  جمع کل مرجوعی:
                </td>
                <td className="px-2 py-2.5 text-center text-sm font-bold text-card-foreground">
                  {totals.qty.toLocaleString("fa-IR")} قلم
                </td>
                <td className="px-2 py-2.5 text-center text-sm font-bold text-card-foreground">
                  {totals.amount.toLocaleString("fa-IR")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* نسخه موبایل: کارت */}
        <div className="md:hidden space-y-2">
          {items.map((item) => (
            <div
              key={item.productId}
              className={`border border-border rounded-lg p-3 space-y-2.5 ${
                item.qty > 0 ? "bg-primary/[0.03]" : "bg-card"
              }`}
            >
              <div>
                <p className="font-medium text-card-foreground text-sm truncate">
                  {item.productName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.productCode} — سفارش‌شده: {item.orderedQty.toLocaleString("fa-IR")}
                  {item.alreadyReturnedQty > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {" "}
                      | قبلاً مرجوع: {item.alreadyReturnedQty.toLocaleString("fa-IR")}
                    </span>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">
                    تعداد مرجوعی (حداکثر {item.maxReturnableQty.toLocaleString("fa-IR")})
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={item.maxReturnableQty}
                    value={item.qty}
                    onChange={(e) => onItemChange(item.productId, "qty", e.target.value)}
                    className="h-8 text-center text-xs w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">دلیل</label>
                  <Select
                    value={item.reason}
                    onValueChange={(v) => onItemChange(item.productId, "reason", v)}
                    disabled={item.qty === 0}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REASON_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Textarea
                placeholder="توضیح اختیاری..."
                value={item.note || ""}
                onChange={(e) => onItemChange(item.productId, "note", e.target.value)}
                rows={1}
                disabled={item.qty === 0}
                className="resize-none text-xs h-8"
              />

              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-xs text-muted-foreground">جمع</span>
                <span className="text-sm font-bold text-card-foreground">
                  {(item.qty * item.unitPrice).toLocaleString("fa-IR")}
                </span>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 border border-border">
            <span className="text-sm font-medium text-muted-foreground">
              جمع کل ({totals.qty.toLocaleString("fa-IR")} قلم):
            </span>
            <span className="text-sm font-bold text-card-foreground">
              {totals.amount.toLocaleString("fa-IR")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}