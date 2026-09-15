import { useState } from "react";
import { PackagePlus, ChevronDown, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import ProductSearchPanel from "@/shared/components/forms/ProductSearchPanel";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { OFF_SCOPE_KINDS } from "@/shared/domain/returns/scopes";
import ClaimRow from "./ClaimRow";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * ادعاهای «خارج از سند» — دو نوعِ واقعاً متفاوت:
 *
 *   • مازاد (EXCESS)  — بیش از مقدارِ یک قلمِ همین سند رسیده/ارسال شده.
 *                        روی همان قلم می‌نشیند (`orderLineId`) و قیمتش همان
 *                        قیمتِ قلم است؛ دستی عوض نمی‌شود.
 *   • نامرتبط (UNLISTED) — کالایی که اصلاً در سند نیست. از فهرست کالاها
 *                        انتخاب می‌شود و قیمتش دستی است.
 *
 * هیچ‌کدام سهمیه‌ی ادعای روی سند را مصرف نمی‌کنند؛ سقفشان را سرور از
 * دانه‌های مازاد (قرنطینه در خرید، ارسالِ مازاد در فروش) می‌گیرد.
 */
export default function OffScopeClaimsSection({
  claims,
  orderLines = [],
  onAdd,
  onUpdate,
  onRemove,
  problemLabels,
  kindLabels = {},
  kindStyles = {},
  title = "کالای خارج از سند",
  description,
  // `(claim) => ReactNode` — گزارشِ انبار برای همان ادعا (فقط مرجوعی خرید).
  renderClaimReport,
}) {
  const [openPicker, setOpenPicker] = useState(null);
  const isCatalogOpen = openPicker === OFF_SCOPE_KINDS.UNLISTED;
  const { data: productsData, isLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );

  const products = productsData?.items ?? [];
  const total = claims.reduce(
    (sum, c) => sum + (Number(c.quantity) || 0) * (Number(c.unitPrice) || 0),
    0,
  );

  const addedExcessQuantityOf = (orderLineId) =>
    claims
      .filter(
        (c) =>
          c.offScopeKind === OFF_SCOPE_KINDS.EXCESS && c.orderLineId === orderLineId,
      )
      .reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);

  const togglePicker = (kind) =>
    setOpenPicker((current) => (current === kind ? null : kind));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
          <PackagePlus className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          {orderLines.length > 0 && (
            <PickerToggle
              isOpen={openPicker === OFF_SCOPE_KINDS.EXCESS}
              onClick={() => togglePicker(OFF_SCOPE_KINDS.EXCESS)}
              label={kindLabels[OFF_SCOPE_KINDS.EXCESS] ?? "مازاد روی یک قلم"}
            />
          )}
          <PickerToggle
            isOpen={isCatalogOpen}
            onClick={() => togglePicker(OFF_SCOPE_KINDS.UNLISTED)}
            label={kindLabels[OFF_SCOPE_KINDS.UNLISTED] ?? "کالای خارج از سند"}
          />
        </div>

        {openPicker === OFF_SCOPE_KINDS.EXCESS && (
          <div className="border border-dashed border-border rounded-lg p-2 space-y-1">
            <p className="text-[11px] text-muted-foreground px-1">
              مازادِ کدام قلم؟ قیمت همان قیمتِ قلم در سند است.
            </p>
            {/* ارتفاعِ محدود: در سندِ پرقلم، فهرستِ انتخاب‌شده‌ها زیرِ همین
                لیست است و نباید چند صفحه پایین برود. */}
            <div className="max-h-64 overflow-y-auto custom-scroll divide-y divide-border/60">
            {orderLines.map((line) => (
              <button
                key={line.orderLineId}
                type="button"
                className="w-full flex items-center justify-between gap-2 px-2 py-2 text-right hover:bg-accent/50"
                onClick={() => onAdd(line, OFF_SCOPE_KINDS.EXCESS)}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-card-foreground truncate">
                    {line.productName}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {[line.productCode, `${fa(line.unitPrice)} ریال`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {addedExcessQuantityOf(line.orderLineId) > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary tabular-nums">
                      {fa(addedExcessQuantityOf(line.orderLineId))}
                    </span>
                  )}
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              </button>
            ))}
            </div>
          </div>
        )}

        {isCatalogOpen && (
          <div className="border border-dashed border-border rounded-lg p-2.5">
            {isLoading ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                در حال بارگذاری کالاها...
              </p>
            ) : (
              <ProductSearchPanel
                products={products}
                addedQuantityOf={(productId) =>
                  Number(
                    claims.find(
                      (c) =>
                        c.productId === productId &&
                        c.offScopeKind === OFF_SCOPE_KINDS.UNLISTED,
                    )?.quantity,
                  ) || 0
                }
                onAdd={(product) =>
                  onAdd(
                    {
                      productId: product.id,
                      productCode: product.code,
                      productName: product.name,
                      unit: unitLabelOf(product.unit),
                      unitPrice: product.retailPrice ?? product.purchasePrice ?? 0,
                    },
                    OFF_SCOPE_KINDS.UNLISTED,
                  )
                }
              />
            )}
          </div>
        )}

        {/* اقلامِ انتخاب‌شده زیرِ دکمه‌ها و انتخابگرها می‌آیند، نه بالایشان:
            انتخابگر سرِ جایش می‌ماند و با هر افزودن پایین نمی‌رود. */}
        {claims.length > 0 && (
          <div className="space-y-2 pt-1">
            {claims.map((claim) => {
              const isExcess = claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS;
              return (
                <div
                  key={claim.id}
                  className="border border-border rounded-lg p-2.5 space-y-2 bg-primary/[0.03]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-card-foreground text-sm truncate">
                        {claim.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          claim.productCode,
                          isExcess && `قیمت قلم: ${fa(claim.unitPrice)} ریال`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        kindStyles[claim.offScopeKind] ?? ""
                      }`}
                    >
                      {kindLabels[claim.offScopeKind] ?? claim.offScopeKind}
                    </Badge>
                  </div>
                  {renderClaimReport?.(claim)}
                  <ClaimRow
                    problemLabels={problemLabels}
                    claim={claim}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                    showPrice={!isExcess}
                  />
                </div>
              );
            })}

            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 border border-border">
              <span className="text-sm font-medium text-muted-foreground">
                جمع کالای خارج از سند
              </span>
              <span className="text-sm font-bold text-card-foreground">
                {fa(total)} ریال
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PickerToggle({ isOpen, onClick, label }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="w-full sm:flex-1 h-8 text-xs gap-1.5 min-w-0"
      onClick={onClick}
    >
      <ChevronDown
        className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
      />
      <span className="truncate">افزودن: {label}</span>
    </Button>
  );
}
