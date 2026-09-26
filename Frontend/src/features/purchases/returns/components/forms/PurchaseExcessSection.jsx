import { useMemo, useState } from "react";
import { PackageCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { PriceInput } from "@/shared/components/ui/price-input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { usePurchaseReceivingInfoQuery } from "@/features/warehouse/receiving/services/queries";
import { useAcceptPurchaseExcessMutation } from "@/features/purchases/orders/services/mutations";
import { PURCHASE_STATUSES } from "@/features/purchases/orders/services/constants";
import {
  freeExcessQuantityOf,
  freeUnlistedQuantityOf,
} from "@/features/purchases/returns/domain/purchaseReturnVocabulary";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * ردیف‌های قابل‌خرید از `PurchaseReceivingInfoDto`.
 *
 * سقفِ هر ردیف همان سقفی است که `AcceptPurchaseExcess` چک می‌کند:
 * دانه‌های قرنطینه منهای آنچه ادعاهای بازِ مرجوعی رزرو کرده‌اند
 * (`freeExcessQuantity` / `freeQuantity`). دانه‌ای که در ادعای مرجوعی
 * است یا خریده می‌شود یا پس فرستاده — هرگز هر دو.
 */
function candidatesOf(info) {
  if (!info) return [];
  const excess = (info.items || [])
    .filter((item) => freeExcessQuantityOf(item) > 0)
    .map((item) => ({
      key: `line-${item.purchaseItemId}`,
      purchaseItemId: item.purchaseItemId,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      unit: item.unit,
      available: freeExcessQuantityOf(item),
      reserved: Math.max(
        0,
        (Number(item.quarantinedExcessQuantity) || 0) -
          freeExcessQuantityOf(item),
      ),
      unitPrice: Number(item.unitPrice) || 0,
      kindLabel: "مازادِ همین قلم",
    }));
  const unlisted = (info.unlistedItems || [])
    .filter((item) => freeUnlistedQuantityOf(item) > 0)
    .map((item) => ({
      key: `product-${item.productId}`,
      purchaseItemId: null,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      unit: item.unit,
      available: freeUnlistedQuantityOf(item),
      reserved: Math.max(
        0,
        (Number(item.quarantinedQuantity) || 0) - freeUnlistedQuantityOf(item),
      ),
      unitPrice: null,
      kindLabel: "سفارش‌نداده",
    }));
  return [...excess, ...unlisted];
}

/**
 * «کالای اضافه را نگه می‌داریم و پولش را می‌دهیم» — `AcceptPurchaseExcess`.
 *
 * مازادِ یک قلم با قیمت و تخفیفِ همان قلم خریده می‌شود و قیمتش اینجا
 * پرسیده نمی‌شود؛ کالای سفارش‌نداده یک قلمِ تازه می‌گیرد و قیمتِ فاکتورِ
 * تامین‌کننده برایش الزامی است. سرور برای هر ردیف یک **قلمِ ضمیمه‌ی تازه**
 * به فاکتور اضافه می‌کند (قلمِ اصلی دست نمی‌خورد)؛ پرداختِ همین مبلغ مثل
 * هر پرداختِ دیگری از کارتِ «پرداخت‌ها» ثبت می‌شود.
 *
 * وقتی چیزی در قرنطینه‌ی آزاد نیست، کارت اصلاً دیده نمی‌شود.
 *
 * جایش در صفحه‌ی ثبت مرجوعی است، نه جزئیاتِ خرید: برای کالای مازاد یا
 * سفارش‌نداده همین‌جا تصمیم گرفته می‌شود — یا پس فرستاده می‌شود (ادعای
 * مرجوعی) یا نگه داشته و خریده می‌شود (این کارت).
 *
 * @param purchase `{ id, status }`
 */
export default function PurchaseExcessSection({ purchase }) {
  const { can } = usePermission();
  const allowed =
    can("PurchaseAcceptExcess") &&
    purchase.status !== PURCHASE_STATUSES.CANCELLED;

  const { data: info } = usePurchaseReceivingInfoQuery(
    allowed ? purchase.id : null,
  );
  const candidates = useMemo(() => candidatesOf(info), [info]);

  if (!allowed || candidates.length === 0) return null;

  // هر بار که ارقامِ سرور عوض شد (دورِ دریافتِ تازه، خریدِ قبلی)، فرم با
  // یک کلیدِ تازه از نو ساخته می‌شود.
  const version = candidates.map((c) => `${c.key}:${c.available}`).join("|");
  return (
    <ExcessForm
      key={version}
      purchaseId={purchase.id}
      candidates={candidates}
    />
  );
}

function ExcessForm({ purchaseId, candidates }) {
  const mutation = useAcceptPurchaseExcessMutation(purchaseId);
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      candidates.map((c) => [
        c.key,
        {
          selected: false,
          quantity: String(c.available),
          unitPrice: null,
          discount: "",
        },
      ]),
    ),
  );
  const [note, setNote] = useState("");

  const update = (key, patch) =>
    setRows((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));

  const selected = candidates.filter((c) => rows[c.key]?.selected);

  const errorOf = (c) => {
    const row = rows[c.key];
    if (!row?.selected) return null;
    const quantity = Number(row.quantity) || 0;
    if (quantity <= 0) return "مقدار باید از صفر بیشتر باشد";
    if (quantity > c.available) return `حداکثر ${fa(c.available)} عدد آزاد است`;
    if (c.purchaseItemId == null) {
      if (!(Number(row.unitPrice) > 0)) return "قیمت واحد فاکتور الزامی است";
      const discount = Number(row.discount) || 0;
      if (discount < 0 || discount > 100) return "تخفیف باید بین ۰ تا ۱۰۰ باشد";
    }
    return null;
  };

  const hasErrors = selected.some((c) => errorOf(c));

  const submit = () => {
    if (selected.length === 0 || hasErrors) return;
    mutation.mutate(
      {
        note,
        items: selected.map((c) => {
          const row = rows[c.key];
          return c.purchaseItemId != null
            ? { purchaseItemId: c.purchaseItemId, quantity: row.quantity }
            : {
                productId: c.productId,
                quantity: row.quantity,
                unitPrice: row.unitPrice,
                discount: row.discount,
              };
        }),
      },
      { onSuccess: () => setNote("") },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-primary" />
          نگه‌داشتن و خریدِ کالای مازاد
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          کالایی که بیش از سفارش یا بدون سفارش رسیده و در قرنطینه است. اگر نگهش
          می‌دارید، اینجا به خرید اضافه‌اش کنید (قلمِ ضمیمه روی فاکتور) و پولش
          را از کارت پرداخت‌های همان خرید ثبت کنید؛ اگر پس می‌فرستید، در «اقلام
          و مشکلات» پایین‌تر «مازاد» یا «کالای سفارش‌نداده» ثبت کنید.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidates.map((c) => {
          const row = rows[c.key] || {};
          const error = errorOf(c);
          const isUnlisted = c.purchaseItemId == null;
          return (
            <div
              key={c.key}
              className="rounded-lg border border-border p-3 space-y-2"
            >
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={!!row.selected}
                  onCheckedChange={(checked) =>
                    update(c.key, { selected: !!checked })
                  }
                  className="mt-0.5"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">
                    {c.productName}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {c.kindLabel} · {fa(c.available)} {c.unit || "عدد"} آزاد
                    {/* بخشی از قرنطینه در ادعای مرجوعیِ باز رزرو شده؛ بدون
                        این، سقفِ پذیرش بی‌دلیل کمتر از عددِ قرنطینه به نظر می‌رسید. */}
                    {c.reserved > 0 && ` · ${fa(c.reserved)} در مرجوعیِ باز`}
                    {!isUnlisted && ` · هر عدد ${fa(c.unitPrice)} ریال`}
                  </span>
                </span>
              </label>

              {row.selected && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">مقدار</Label>
                    <Input
                      type="number"
                      min={1}
                      max={c.available}
                      value={row.quantity}
                      onChange={(e) =>
                        update(c.key, { quantity: e.target.value })
                      }
                      className="h-8"
                    />
                  </div>
                  {isUnlisted && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          قیمت واحد فاکتور (ریال)
                        </Label>
                        <PriceInput
                          min={0}
                          value={row.unitPrice}
                          onValueChange={(next) =>
                            update(c.key, { unitPrice: next })
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">تخفیف (٪)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={row.discount}
                          onChange={(e) =>
                            update(c.key, { discount: e.target.value })
                          }
                          className="h-8"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          );
        })}

        <div className="space-y-1">
          <Label className="text-xs">یادداشت (اختیاری)</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-8"
          />
        </div>

        <Button
          type="button"
          className="w-full gap-2"
          disabled={selected.length === 0 || hasErrors || mutation.isPending}
          onClick={submit}
        >
          <PackageCheck className="h-4 w-4" />
          {mutation.isPending
            ? "در حال ثبت..."
            : "افزودن به خرید و ورود به موجودی"}
        </Button>
      </CardContent>
    </Card>
  );
}
