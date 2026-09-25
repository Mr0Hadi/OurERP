import { useState } from "react";
import { ChevronDown, History, Plus, PackagePlus } from "lucide-react";
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
import { unitLabelOf } from "@/shared/domain/enums/productUnit";
import { claimLineKey } from "@/shared/hooks/useClaimsInOtherReturns";
import ClaimRow from "./ClaimRow";
import { ReceivingReportLines } from "./ReceivingReport";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");
const sumQuantity = (claims) =>
  claims.reduce((sum, claim) => sum + (Number(claim.quantity) || 0), 0);

/** «قبلاً در مرجوعی‌های دیگرِ همین سند»، تا دوبار ثبت نشود. */
function EarlierClaims({ entry }) {
  if (!entry || entry.quantity <= 0) return null;
  return (
    <p className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
      <History className="h-3.5 w-3.5 shrink-0" />
      {fa(entry.quantity)} عدد قبلاً در {entry.returnNumbers.join("، ")} ثبت شده
    </p>
  );
}

/**
 * یک قلمِ سند با همه‌ی ادعاهایش: مشکل‌های روی خودِ قلم (سهمیه‌ی تحویل‌شده)
 * و مازادِ همان قلم — کنارِ هم، چون کاربر هر دو را به‌عنوانِ «مشکلِ همین
 * کالا» می‌بیند، نه دو بخشِ جدا.
 */
function LineCard({
  line,
  excessClaims,
  canAddExcess,
  earlier,
  problemLabels,
  offScopeProblemLabels,
  deliveredLabel,
  kindLabels,
  kindStyles,
  onAddClaim,
  onUpdateClaim,
  onRemoveClaim,
  onAddExcess,
  onUpdateOffScope,
  onRemoveOffScope,
  renderExcessReport,
}) {
  const claims = line.claims || [];
  const allocated = sumQuantity(claims);
  const remaining = Math.max(0, line.maxReturnableQuantity - allocated);
  const hasAny = allocated > 0 || excessClaims.length > 0;

  return (
    <div
      className={`border border-border rounded-lg p-3 space-y-2.5 ${
        hasAny ? "bg-primary/[0.03]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-card-foreground text-sm break-words">
            {line.productName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {line.productCode}
          </p>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums shrink-0 text-left">
          <div>
            {fa(allocated)} از {fa(line.maxReturnableQuantity)} ثبت‌شده
          </div>
          <div className="text-[11px] opacity-70">
            {deliveredLabel}: {fa(line.deliveredQuantity ?? 0)}
          </div>
        </div>
      </div>

      <EarlierClaims entry={earlier} />

      {/* فقط مرجوعیِ خرید گزارشِ دریافت دارد؛ خطِ فروش آن را ندارد. */}
      {line.receivingReport && (
        <ReceivingReportLines {...line.receivingReport} />
      )}

      {claims.length > 0 && (
        <div className="space-y-1.5">
          {claims.map((claim) => (
            <ClaimRow
              key={claim.id}
              claim={claim}
              onUpdate={(claimId, field, value) =>
                onUpdateClaim(line.lineKey, claimId, field, value)
              }
              onRemove={(claimId) => onRemoveClaim(line.lineKey, claimId)}
              problemLabels={problemLabels}
            />
          ))}
        </div>
      )}

      {excessClaims.map((claim) => (
        <div
          key={claim.id}
          className="space-y-1.5 rounded-md border border-dashed border-border p-2"
        >
          <Badge
            variant="outline"
            className={`text-[10px] ${kindStyles[OFF_SCOPE_KINDS.EXCESS] ?? ""}`}
          >
            {kindLabels[OFF_SCOPE_KINDS.EXCESS] ?? "مازاد"} · قیمت قلم{" "}
            {fa(claim.unitPrice)} ریال
          </Badge>
          {renderExcessReport?.(claim)}
          <ClaimRow
            claim={claim}
            onUpdate={onUpdateOffScope}
            onRemove={onRemoveOffScope}
            problemLabels={offScopeProblemLabels}
            showPrice={false}
          />
        </div>
      ))}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={() => onAddClaim(line.lineKey)}
          disabled={remaining <= 0}
        >
          <Plus className="h-3.5 w-3.5" />
          {remaining > 0 ? "افزودن مشکل" : "کل مقدار تحویل‌شده ثبت شده"}
        </Button>
        {canAddExcess && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={onAddExcess}
          >
            <Plus className="h-3.5 w-3.5" />
            {kindLabels[OFF_SCOPE_KINDS.EXCESS] ?? "مازاد"} روی این کالا
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * همه‌ی ادعاهای یک مرجوعیِ تازه در یک کارت:
 *
 *   • هر قلمِ سند یک کارت دارد با مشکل‌های روی خودش (سقف: تحویل‌شده‌ای که
 *     هنوز ادعا نشده) و مازادِ همان قلم (سقف: مازادِ در قرنطینه/ارسالی؛
 *     قیمت همان قیمتِ قلم).
 *   • کالای سفارش‌نداده (UNLISTED) زیرِ فهرست، با انتخاب از کالاها و قیمتِ دستی.
 *
 * قبلاً این دو در دو کارتِ جدا («مشکلات اقلام» و «کالای خارج از سفارش»)
 * بودند و کاربر نمی‌دانست مازادِ یک کالا را کجا ثبت کند.
 *
 * @param claimsElsewhere خروجیِ `useClaimsInOtherReturns` — مقدارِ ادعاشده
 *   در مرجوعی‌های دیگرِ همین سند برای هر خط.
 */
export default function ReturnItemsSection({
  lines,
  offScopeClaims,
  orderLines = [],
  claimsElsewhere,
  onAddClaim,
  onUpdateClaim,
  onRemoveClaim,
  onAddOffScope,
  onUpdateOffScope,
  onRemoveOffScope,
  problemLabels,
  offScopeProblemLabels,
  kindLabels = {},
  kindStyles = {},
  renderOffScopeReport,
  title = "اقلام و مشکلات",
  description,
  emptyText = "این سند قلمی برای ادعا ندارد",
  deliveredLabel = "تحویل‌شده",
  unlistedHint,
}) {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const { data: productsData, isLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );
  const products = productsData?.items ?? [];

  const excessOf = (orderLineId) =>
    offScopeClaims.filter(
      (claim) =>
        claim.offScopeKind === OFF_SCOPE_KINDS.EXCESS &&
        claim.orderLineId === orderLineId,
    );
  const unlisted = offScopeClaims.filter(
    (claim) => claim.offScopeKind === OFF_SCOPE_KINDS.UNLISTED,
  );

  const onOrderAmount = lines.reduce(
    (sum, line) =>
      sum + sumQuantity(line.claims || []) * (Number(line.unitPrice) || 0),
    0,
  );
  const offScopeAmount = offScopeClaims.reduce(
    (sum, claim) =>
      sum + (Number(claim.quantity) || 0) * (Number(claim.unitPrice) || 0),
    0,
  );
  const totalQuantity =
    lines.reduce((sum, line) => sum + sumQuantity(line.claims || []), 0) +
    sumQuantity(offScopeClaims);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          {title}
        </CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {lines.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6 border border-dashed border-border rounded-lg">
            {emptyText}
          </p>
        ) : (
          lines.map((line) => {
            const orderLine = orderLines.find(
              (candidate) => candidate.orderLineId === line.orderLineId,
            );
            return (
              <LineCard
                key={line.lineKey}
                line={line}
                excessClaims={excessOf(line.orderLineId)}
                canAddExcess={Boolean(orderLine)}
                earlier={claimsElsewhere?.get(
                  claimLineKey({ orderLineId: line.orderLineId }),
                )}
                problemLabels={problemLabels}
                offScopeProblemLabels={offScopeProblemLabels ?? problemLabels}
                deliveredLabel={deliveredLabel}
                kindLabels={kindLabels}
                kindStyles={kindStyles}
                onAddClaim={onAddClaim}
                onUpdateClaim={onUpdateClaim}
                onRemoveClaim={onRemoveClaim}
                onAddExcess={() =>
                  onAddOffScope(orderLine, OFF_SCOPE_KINDS.EXCESS)
                }
                onUpdateOffScope={onUpdateOffScope}
                onRemoveOffScope={onRemoveOffScope}
                renderExcessReport={renderOffScopeReport}
              />
            );
          })
        )}

        {/* کالای سفارش‌نداده */}
        <div className="rounded-lg border border-dashed border-border p-2.5 space-y-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs gap-1.5"
            onClick={() => setIsCatalogOpen((open) => !open)}
          >
            <PackagePlus className="h-3.5 w-3.5" />
            {kindLabels[OFF_SCOPE_KINDS.UNLISTED] ?? "کالای سفارش‌نداده"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${isCatalogOpen ? "rotate-180" : ""}`}
            />
          </Button>
          {unlistedHint && (
            <p className="text-[11px] text-muted-foreground px-1">
              {unlistedHint}
            </p>
          )}

          {isCatalogOpen &&
            (isLoading ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                در حال بارگذاری کالاها...
              </p>
            ) : (
              <ProductSearchPanel
                products={products}
                addedQuantityOf={(productId) =>
                  Number(
                    unlisted.find((claim) => claim.productId === productId)
                      ?.quantity,
                  ) || 0
                }
                onAdd={(product) =>
                  onAddOffScope(
                    {
                      productId: product.id,
                      productCode: product.code,
                      productName: product.name,
                      unit: unitLabelOf(product.unit),
                      unitPrice:
                        product.retailPrice ?? product.purchasePrice ?? 0,
                    },
                    OFF_SCOPE_KINDS.UNLISTED,
                  )
                }
              />
            ))}

          {unlisted.map((claim) => (
            <div
              key={claim.id}
              className="border border-border rounded-lg p-2.5 space-y-2 bg-primary/[0.03]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-card-foreground text-sm break-words">
                    {claim.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {claim.productCode}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${kindStyles[OFF_SCOPE_KINDS.UNLISTED] ?? ""}`}
                >
                  {kindLabels[OFF_SCOPE_KINDS.UNLISTED] ?? "سفارش‌نداده"}
                </Badge>
              </div>
              <EarlierClaims
                entry={claimsElsewhere?.get(claimLineKey(claim))}
              />
              {renderOffScopeReport?.(claim)}
              <ClaimRow
                claim={claim}
                onUpdate={onUpdateOffScope}
                onRemove={onRemoveOffScope}
                problemLabels={offScopeProblemLabels ?? problemLabels}
                showPrice
              />
            </div>
          ))}
        </div>

        {totalQuantity > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 border border-border">
            <span className="text-sm font-medium text-muted-foreground">
              جمع ادعاها ({fa(totalQuantity)} عدد):
            </span>
            <Badge variant="outline" className="text-sm font-bold">
              {fa(onOrderAmount + offScopeAmount)} ریال
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
