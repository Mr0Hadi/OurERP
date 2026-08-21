import { useState } from "react";
import { PackagePlus, ChevronDown } from "lucide-react";
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
import ClaimRow from "./ClaimRow";
import {
  OFF_INVOICE_KIND_LABELS,
  OFF_INVOICE_KIND_STYLES,
} from "../../domain/returnVocabulary";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

/**
 * ادعاهای «خارج از فاکتور» — قرینه‌ی «مازاد» در مرجوعی خرید.
 *
 * دو حالتی که این بخش پوشش می‌دهد و بدون آن هیچ راه ثبتی نداشتند:
 *   • انبار از یک کالای فاکتور، بیشتر از مقدار ثبت‌شده فرستاده
 *   • انبار کالایی فرستاده که اصلاً در این فاکتور نیست
 *
 * هر دو خطای انبارند — یکی از سه مقصری که این سیستم باید بتواند ثبت
 * کند — و چون بیرون از سقف خط فروش‌اند، سهمیه‌ی قابل ادعای هیچ خطی را
 * مصرف نمی‌کنند و قیمتشان هم دستی وارد می‌شود.
 */
export default function OffInvoiceClaimsSection({
  claims,
  onAdd,
  onUpdate,
  onRemove,
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { data: productsData, isLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );

  const products = productsData?.items ?? [];
  const total = claims.reduce(
    (sum, c) => sum + (Number(c.qty) || 0) * (Number(c.unitPrice) || 0),
    0,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
          <PackagePlus className="h-4 w-4 text-muted-foreground" />
          کالای خارج از فاکتور
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          کالایی که مشتری دارد ولی فاکتور توجیهش نمی‌کند — بیشتر از مقدار
          ارسال‌شده، یا کالایی که اصلاً در این فاکتور نبوده.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {claims.length > 0 && (
          <div className="space-y-2">
            {claims.map((claim) => (
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
                      {claim.productCode}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      OFF_INVOICE_KIND_STYLES[claim.offInvoiceKind] ?? ""
                    }`}
                  >
                    {OFF_INVOICE_KIND_LABELS[claim.offInvoiceKind] ??
                      claim.offInvoiceKind}
                  </Badge>
                </div>
                <ClaimRow
                  claim={claim}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  showPrice
                />
              </div>
            ))}

            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 border border-border">
              <span className="text-sm font-medium text-muted-foreground">
                جمع کالای خارج از فاکتور
              </span>
              <span className="text-sm font-bold text-card-foreground">
                {total.toLocaleString("fa-IR")} ریال
              </span>
            </div>
          </div>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs gap-1.5"
          onClick={() => setIsPickerOpen((open) => !open)}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              isPickerOpen ? "rotate-180" : ""
            }`}
          />
          {isPickerOpen ? "بستن انتخاب کالا" : "افزودن کالای خارج از فاکتور"}
        </Button>

        {isPickerOpen && (
          <div className="border border-dashed border-border rounded-lg p-2.5">
            {isLoading ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                در حال بارگذاری کالاها...
              </p>
            ) : (
              <ProductSearchPanel
                products={products}
                isAdded={(product) =>
                  claims.some((c) => c.productId === product.id)
                }
                onAdd={(product) =>
                  onAdd({
                    productId: product.id,
                    productCode: product.code,
                    productName: product.name,
                    unit: product.unit,
                    unitPrice: product.retailPrice ?? product.purchasePrice ?? 0,
                  })
                }
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
