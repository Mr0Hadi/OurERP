import { useState } from "react";
import { ChevronDown, PackagePlus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import ProductSearchPanel from "@/shared/components/forms/ProductSearchPanel";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import ObservationEditor from "@/shared/components/returns/ObservationEditor";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";
import { NO_QUANTITY_CAP } from "../../hooks/useReceivingForm";
import QuickCreateProductDialog from "./QuickCreateProductDialog";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * کالایی که رسیده ولی در این خرید هیچ قلمی ندارد. تماماً به قرنطینه
 * می‌رود و با «ثبت مغایرت» تکلیفش روشن می‌شود. کالای دارای قلم اینجا
 * پذیرفته نمی‌شود — مقدارِ اضافه‌اش روی همان قلم ثبت می‌شود.
 */
export default function ReceivingUnlistedItemsSection({
  rows,
  onAdd,
  onRemove,
  onArrivedChange,
  onAddDefect,
  onUpdateDefect,
  onRemoveDefect,
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: productsData, isLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );

  const add = (product) => {
    const { rejected } = onAdd(product);
    if (rejected) {
      toast.error("این کالا در خرید قلم دارد؛ مقدارِ اضافه را روی همان قلم ثبت کنید");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PackagePlus className="h-4 w-4 text-muted-foreground" />
          کالای رسیده خارج از سفارش
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          کالایی که سفارش داده نشده ولی در محموله بود. به قرنطینه می‌رود و جزو موجودی نیست.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div key={row.rowKey} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{row.productName}</p>
                <p className="text-xs text-muted-foreground">{row.productCode}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <QuantityStepper
                  value={row.arrivedQuantity}
                  max={NO_QUANTITY_CAP}
                  onChange={(next) => onArrivedChange(row.rowKey, next)}
                  size="sm"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(row.rowKey)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {row.arrivedQuantity > 0 && (
              <ObservationEditor
                round={{
                  effectId: row.rowKey,
                  quantity: row.arrivedQuantity,
                  observations: row.defects,
                }}
                onAddObservation={onAddDefect}
                onUpdateObservation={onUpdateDefect}
                onRemoveObservation={onRemoveDefect}
                title={`خرابی‌ها (${fa(row.arrivedQuantity)} عدد رسیده)`}
                emptyHint="اگر بخشی از این کالا خراب هم هست، ثبتش کنید تا در فرم مغایرت پیشنهاد شود."
                healthySuffix="عدد سالم"
                addLabel="افزودن خرابی"
              />
            )}
          </div>
        ))}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={() => setIsPickerOpen((open) => !open)}
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${isPickerOpen ? "rotate-180" : ""}`}
            />
            {isPickerOpen ? "بستن فهرست کالاها" : "افزودن از فهرست کالاها"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={() => setIsCreateOpen(true)}
          >
            <PackagePlus className="h-3.5 w-3.5" />
            کالا در فهرست نیست — ساخت سریع
          </Button>
        </div>

        {isPickerOpen && (
          <div className="border border-dashed border-border rounded-lg p-2.5">
            {isLoading ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                در حال بارگذاری کالاها...
              </p>
            ) : (
              <ProductSearchPanel
                products={productsData?.items ?? []}
                addedQuantityOf={(productId) =>
                  Number(rows.find((row) => row.productId === productId)?.arrivedQuantity) || 0
                }
                onAdd={(product) =>
                  add({
                    productId: product.id,
                    productCode: product.code,
                    productName: product.name,
                    unit: unitLabelOf(product.unit),
                  })
                }
              />
            )}
          </div>
        )}

        <QuickCreateProductDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreated={add}
        />
      </CardContent>
    </Card>
  );
}
