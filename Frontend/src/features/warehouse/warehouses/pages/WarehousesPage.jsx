import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, Ban, MapPin, Pencil, Warehouse as WarehouseIcon } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Skeleton } from "@/shared/components/ui/skeleton";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import StatGrid from "@/shared/components/data/StatGrid";
import StatusBadge from "@/shared/components/status/StatusBadge";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import EmptyState from "@/shared/components/feedback/EmptyState";
import Notice from "@/shared/components/feedback/Notice";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { ROUTES } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useWarehousesQuery } from "../services/queries";
import { useDeactivateWarehouseMutation } from "../services/mutations";
import { useMultiWarehouse } from "../hooks/useMultiWarehouse";
import { deactivateBlocker } from "../domain/warehouse";
import WarehouseFormDialog from "../components/WarehouseFormDialog";
import UnitsPageLink from "@/features/warehouse/units/components/UnitsPageLink";

function WarehouseCard({ warehouse, canManage, onEdit, onDeactivate }) {
  const blocker = deactivateBlocker(warehouse);
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
        warehouse.isDefault && "border-primary/40",
        !warehouse.isActive && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <WarehouseIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{warehouse.name}</p>
          <p className="text-right font-mono text-xs text-muted-foreground" dir="ltr">
            {warehouse.code}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {warehouse.isDefault && <StatusBadge tone="primary" size="sm">پیش‌فرض</StatusBadge>}
          {!warehouse.isActive && <StatusBadge tone="neutral" size="sm">غیرفعال</StatusBadge>}
        </div>
      </div>

      {warehouse.address && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          <span className="[overflow-wrap:anywhere]">{warehouse.address}</span>
        </p>
      )}

      <StatGrid
        size="sm"
        className="grid-cols-4 text-center"
        items={[
          { label: "روی قفسه", value: formatNumber(warehouse.inStockUnits) },
          { label: "قرنطینه", value: formatNumber(warehouse.quarantinedUnits), tone: warehouse.quarantinedUnits ? "warning" : undefined },
          { label: "رزرو", value: formatNumber(warehouse.reservedUnits) },
          { label: "در راه", value: formatNumber(warehouse.outgoingInTransitUnits), tone: warehouse.outgoingInTransitUnits ? "info" : undefined },
        ]}
      />

      <UnitsPageLink params={{ warehouseId: warehouse.id }} label="دانه‌های این انبار" className="w-full" />

      {canManage && warehouse.isActive && (
        <div className="mt-auto flex gap-2 border-t border-border pt-3">
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onEdit}>
            <Pencil className="size-3.5" />
            ویرایش
          </Button>
          {/* انبارِ پیش‌فرض اصلاً غیرفعال‌شدنی نیست؛ دکمه‌ی خاموش فقط وقتی معنا دارد که مانع رفع‌شدنی است. */}
          {!warehouse.isDefault && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5 text-destructive hover:text-destructive"
              disabled={Boolean(blocker)}
              title={blocker ?? undefined}
              onClick={onDeactivate}
            >
              <Ban className="size-3.5" />
              غیرفعال‌کردن
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * انبارها (`GetWarehouseList`): هر انبار با شمارِ دانه‌هایش؛ افزودن، ویرایش و غیرفعال‌کردن با `WarehouseManage`.
 * تعریفِ انبار با چندانبارِ خاموش هم ممکن است؛ تا سوییچ روشن نشود همه‌ی ورودی‌ها به انبارِ پیش‌فرض می‌روند.
 */
export default function WarehousesPage() {
  const { allows } = usePermission();
  const canManage = allows("WarehouseManage");
  const multi = useMultiWarehouse();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [form, setForm] = useState({ open: false, warehouse: null });
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const deactivate = useDeactivateWarehouseMutation();
  const query = useWarehousesQuery({ includeInactive });
  const warehouses = query.data ?? [];

  usePageHeader({ title: "انبارها" });

  return (
    <ListPageLayout
      title="انبارها"
      icon={WarehouseIcon}
      description="جایی که هر دانه‌ی کالا نگه داشته می‌شود"
      create={canManage ? { label: "انبارِ تازه", onClick: () => setForm({ open: true, warehouse: null }) } : undefined}
      actions={
        multi.enabled &&
        allows(["StockTransferView", "StockTransferManage"]) && (
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to={ROUTES.WAREHOUSE_TRANSFERS}>
              <ArrowLeftRight className="size-4" />
              حواله‌ها
            </Link>
          </Button>
        )
      }
    >
      {!multi.isPending && !multi.enabled && (
        <Notice tone="info">
          چندانبار خاموش است: کالای ورودی به انبارِ پیش‌فرض می‌رود، خروجی از هر انباری برداشته می‌شود و حواله‌ی تازه ثبت
          نمی‌شود. روشن کردنش در{" "}
          <Link to={ROUTES.SETTINGS} className="font-medium underline underline-offset-4">
            تنظیمات
          </Link>{" "}
          است.
        </Notice>
      )}

      <div className="flex items-center justify-end gap-2">
        <Label htmlFor="warehouse-include-inactive" className="text-xs text-muted-foreground">
          نمایشِ انبارهای غیرفعال
        </Label>
        <Switch id="warehouse-include-inactive" checked={includeInactive} onCheckedChange={setIncludeInactive} />
      </div>

      {query.isError ? (
        <QueryErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : warehouses.length === 0 ? (
        <EmptyState icon={WarehouseIcon} title="انباری نیست" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {warehouses.map((warehouse) => (
            <WarehouseCard
              key={warehouse.id}
              warehouse={warehouse}
              canManage={canManage}
              onEdit={() => setForm({ open: true, warehouse })}
              onDeactivate={() => setDeactivateTarget(warehouse)}
            />
          ))}
        </ul>
      )}

      <WarehouseFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((prev) => ({ ...prev, open }))}
        warehouse={form.warehouse}
      />
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={`غیرفعال‌کردنِ «${deactivateTarget?.name ?? ""}»`}
        description="سابقه‌اش می‌ماند، ولی دیگر برای دریافت، ارسال و حواله انتخاب نمی‌شود. انبارِ دارای دانه، حواله‌ی در راه یا انبارگردانیِ باز غیرفعال نمی‌شود."
        confirmLabel="غیرفعال‌کردن"
        pendingLabel="در حال انجام..."
        destructive
        isPending={deactivate.isPending}
        onConfirm={() => {
          // نگهبانِ `null`: React Compiler این را در خودِ رندر هم می‌خواند.
          if (!deactivateTarget) return;
          deactivate.mutate(deactivateTarget.id, { onSuccess: () => setDeactivateTarget(null) });
        }}
      />
    </ListPageLayout>
  );
}
