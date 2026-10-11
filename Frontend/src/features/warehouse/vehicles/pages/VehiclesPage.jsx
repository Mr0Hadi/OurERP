import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Car,
  ChevronLeft,
  ChevronRight,
  Infinity as InfinityIcon,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import MasterListPane from "@/shared/components/layout/MasterListPane";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { usePermission } from "@/features/auth/hooks/usePermission";

import { useVehicleProductsQuery, useVehiclesQuery } from "../services/queries";
import {
  useDeleteVehicleMutation,
  useRemoveProductFromVehicleMutation,
} from "../services/mutations";
import VehicleFormDialog from "../components/VehicleFormDialog";
import AddProductsToVehicleDialog from "../components/AddProductsToVehicleDialog";

/** شناسه‌ی مسیرِ «همه‌ی خودروها»: کالاهایی که به هیچ خودرویی وصل نیستند. */
const ALL_ID = "all";
const PAGE_SIZE = 20;
const detailPath = (id) => routeWithId(ROUTES.WAREHOUSE_VEHICLES_DETAIL, id);

function VehicleList({ selectedId, className, canManage, onCreate, data, isLoading }) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  // خودروها یک‌جا گرفته شده‌اند؛ جست‌وجو همین‌جا فیلتر می‌کند.
  const vehicles = (data?.items ?? []).filter((v) => v.name.toLowerCase().includes(term));

  return (
    <MasterListPane
      className={className}
      header={
        canManage && (
          <Button onClick={onCreate} size="sm" className="w-full gap-1.5">
            <Plus className="size-4" />
            خودروی جدید
          </Button>
        )
      }
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="جست‌وجوی خودرو..."
      isLoading={isLoading}
      selectedId={selectedId}
      pinned={[
        {
          id: ALL_ID,
          title: "همه‌ی خودروها",
          subtitle: "کالاهای بدونِ خودروی مشخص",
          icon: <InfinityIcon className="size-4" />,
          trailing: formatNumber(data?.universalProductCount ?? 0),
          to: detailPath(ALL_ID),
        },
      ]}
      items={vehicles.map((v) => ({
        id: v.id,
        title: v.name,
        subtitle: v.productCount > 0 ? `${formatNumber(v.productCount)} کالا` : "بدون کالا",
        icon: <Car className="size-4" />,
        to: detailPath(v.id),
      }))}
      emptyText={search ? "خودرویی پیدا نشد." : "هنوز خودرویی تعریف نشده."}
      footerText={`${formatNumber(data?.total ?? vehicles.length)} خودرو`}
    />
  );
}

function ProductRow({ product, canRemove, onRemove }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
      <ProductThumb item={{ ...product, productName: product.name }} />
      <Link
        to={routeWithId(ROUTES.WAREHOUSE_PRODUCTS_DETAIL, product.id)}
        className="min-w-0 flex-1 hover:text-primary"
      >
        <span className="block truncate text-sm font-medium">{product.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {[product.code, product.brand, product.categoryName].filter(Boolean).join(" · ")}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground sm:hidden">
          موجودی {formatNumber(product.stock)}
          {product.vehicleCount > 1 && ` · ${formatNumber(product.vehicleCount)} خودرو`}
        </span>
      </Link>
      <span className="hidden w-20 shrink-0 text-center text-xs text-muted-foreground sm:block">
        موجودی
        <span className="block text-sm font-medium text-foreground tabular-nums">
          {formatNumber(product.stock)}
        </span>
      </span>
      {product.vehicleCount > 1 && (
        <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">
          {formatNumber(product.vehicleCount)} خودرو
        </span>
      )}
      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`حذف ${product.name} از این خودرو`}
          onClick={() => onRemove(product)}
        >
          <X className="size-4" />
        </Button>
      )}
    </li>
  );
}

function VehicleDetail({ id, vehicle, canManage, onRename, onDelete, onAddProducts }) {
  const isAll = id === ALL_ID;
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [termFor, setTermFor] = useState(term);
  if (termFor !== term) {
    setTermFor(term);
    setPage(1);
  }

  const [removeTarget, setRemoveTarget] = useState(null);
  const removeMutation = useRemoveProductFromVehicleMutation();

  const query = useVehicleProductsQuery({
    vehicleId: isAll ? null : Number(id),
    search: term,
    page,
    take: PAGE_SIZE,
  });
  const products = query.data?.items ?? [];
  const totalPages = query.data?.totalPages ?? 1;
  const total = query.data?.total ?? 0;

  const title = isAll ? "همه‌ی خودروها" : vehicle?.name ?? "…";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 sm:px-4">
        <Button asChild variant="ghost" size="icon" className="lg:hidden">
          <Link to={ROUTES.WAREHOUSE_VEHICLES} aria-label="بازگشت به فهرست خودروها">
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isAll ? <InfinityIcon className="size-5" /> : <Car className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">{title}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {isAll
              ? "کالاهایی که خودرویی برایشان انتخاب نشده و برای همه حساب می‌شوند"
              : `${formatNumber(total)} کالا`}
          </p>
        </div>
        {canManage && !isAll && vehicle && (
          <>
            <Button size="sm" className="gap-1.5" onClick={onAddProducts}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">افزودن کالا</span>
            </Button>
            <Button variant="outline" size="sm" className="hidden gap-1.5 md:inline-flex" onClick={onRename}>
              <Pencil className="size-3.5" />
              ویرایش نام
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-1.5 text-destructive hover:text-destructive md:inline-flex"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
              حذف
            </Button>
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="گزینه‌های خودرو">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onRename}>
                  <Pencil className="size-4" />
                  ویرایش نام
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 className="size-4" />
                  حذف خودرو
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="نام، کد یا برند کالا..."
            className="h-9 pr-8"
          />
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto", query.isFetching && !query.isLoading && "opacity-60")}>
          {query.isError ? (
            <QueryErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : query.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <Car className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {term
                  ? "کالایی با این جست‌وجو پیدا نشد."
                  : isAll
                    ? "همه‌ی کالاها به خودروی مشخصی وصل‌اند."
                    : "هنوز کالایی برای این خودرو ثبت نشده."}
              </p>
              {!term && !isAll && canManage && (
                <Button size="sm" variant="outline" className="mt-1 gap-1.5" onClick={onAddProducts}>
                  <Plus className="size-4" />
                  افزودن کالا
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  canRemove={canManage && !isAll}
                  onRemove={setRemoveTarget}
                />
              ))}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              صفحه {formatNumber(page)} از {formatNumber(totalPages)} · {formatNumber(total)} کالا
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                aria-label="صفحه‌ی قبل"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                aria-label="صفحه‌ی بعد"
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={`حذف «${removeTarget?.name ?? ""}» از ${title}`}
        description={
          removeTarget?.vehicleCount === 1
            ? "این کالا خودروی دیگری ندارد؛ پس از حذف، برای همه‌ی خودروها حساب می‌شود. خودِ کالا پاک نمی‌شود."
            : "فقط ارتباطِ کالا با این خودرو برداشته می‌شود؛ خودِ کالا و خودروهای دیگرش دست‌نخورده می‌مانند."
        }
        confirmLabel="حذف از خودرو"
        pendingLabel="در حال حذف..."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          removeMutation.mutate(
            { vehicleId: Number(id), productId: removeTarget?.id },
            {
              onSuccess: () => {
                setRemoveTarget(null);
                // آخرین کالای صفحه رفت: به صفحه‌ی قبل.
                if (products.length === 1 && page > 1) setPage(page - 1);
              },
            },
          )
        }
      />
    </div>
  );
}

/**
 * «خودروها»: فهرستِ خودروها در ستونِ کنار (مثلِ دسترسی کارمندان) و کالاهای
 * خودروی انتخاب‌شده در کنارش. «همه‌ی خودروها» کالاهایی‌اند که خودرویی ندارند.
 * در موبایل فهرست و جزئیات جدا نمایش داده می‌شوند.
 */
export default function VehiclesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermission();
  const canManage = can("VehicleManage");

  usePageHeader({ title: "خودروها" });

  const vehiclesQuery = useVehiclesQuery();
  const vehicle =
    id && id !== ALL_ID
      ? (vehiclesQuery.data?.items ?? []).find((v) => String(v.id) === String(id))
      : null;
  // نشانیِ دست‌کاری‌شده (`/vehicles/abc`) هم مثلِ خودروی حذف‌شده: بدونِ درخواست به سرور.
  const isValidId = !id || id === ALL_ID || /^\d+$/.test(id);
  const vehicleMissing =
    !isValidId || (id && id !== ALL_ID && vehiclesQuery.isSuccess && !vehicle);

  const [formState, setFormState] = useState({ open: false, vehicle: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const deleteMutation = useDeleteVehicleMutation();

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:h-[calc(100svh-6.5rem)] lg:grid-cols-[19rem_minmax(0,1fr)]">
      <VehicleList
        selectedId={id}
        className={id ? "hidden lg:flex" : "flex h-[calc(100svh-7rem)] lg:h-auto"}
        canManage={canManage}
        onCreate={() => setFormState({ open: true, vehicle: null })}
        data={vehiclesQuery.data}
        isLoading={vehiclesQuery.isLoading}
      />

      <main className={id ? "flex min-h-[calc(100svh-7rem)] min-w-0 flex-col lg:min-h-0" : "hidden min-h-0 min-w-0 lg:flex"}>
        {vehicleMissing ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <Car className="size-8 text-muted-foreground/60" />
            <p className="font-medium">این خودرو پیدا نشد یا حذف شده است.</p>
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES.WAREHOUSE_VEHICLES}>بازگشت به فهرست</Link>
            </Button>
          </div>
        ) : id ? (
          <VehicleDetail
            key={id}
            id={id}
            vehicle={vehicle}
            canManage={canManage}
            onRename={() => setFormState({ open: true, vehicle })}
            onDelete={() => setDeleteTarget(vehicle)}
            onAddProducts={() => setIsAddOpen(true)}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <Car className="size-8 text-muted-foreground/60" />
            <p className="font-medium">یک خودرو را از فهرست انتخاب کنید</p>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              هر کالا می‌تواند برای چند خودرو باشد. کالایی که خودرویی ندارد زیرِ
              «همه‌ی خودروها» می‌آید و در جست‌وجوی هر خودرویی دیده می‌شود.
            </p>
          </div>
        )}
      </main>

      <VehicleFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        vehicle={formState.vehicle}
        onSaved={(saved) => !formState.vehicle && saved?.id && navigate(detailPath(saved.id))}
      />

      <AddProductsToVehicleDialog open={isAddOpen} onOpenChange={setIsAddOpen} vehicle={vehicle} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`حذف خودروی «${deleteTarget?.name ?? ""}»`}
        description={
          deleteTarget?.productCount > 0
            ? `${formatNumber(deleteTarget.productCount)} کالا به این خودرو وصل است. کالاها پاک نمی‌شوند، ولی آن‌هایی که خودروی دیگری ندارند برای همه‌ی خودروها حساب می‌شوند.`
            : "این خودرو کالایی ندارد و از فهرست‌ها برداشته می‌شود."
        }
        confirmLabel="حذف"
        pendingLabel="در حال حذف..."
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteMutation.mutate(deleteTarget?.id, {
            onSuccess: () => {
              setDeleteTarget(null);
              navigate(ROUTES.WAREHOUSE_VEHICLES, { replace: true });
            },
          })
        }
      />
    </div>
  );
}
