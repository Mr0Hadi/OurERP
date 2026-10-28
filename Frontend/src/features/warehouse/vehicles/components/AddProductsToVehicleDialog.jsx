import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import { fetchProducts } from "@/features/warehouse/products/services/api-v1";
import { productKeys } from "@/features/warehouse/products/services/queryKeys";
import { useAddProductsToVehicleMutation } from "../services/mutations";
import DialogActions from "@/shared/components/feedback/DialogActions";

const SEARCH_TAKE = 30;

function AddProductsBody({ vehicle, onClose }) {
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search);
  // انتخاب‌ها با شیءِ کالا نگه داشته می‌شوند تا با عوض‌شدنِ جست‌وجو گم نشوند.
  const [picked, setPicked] = useState(() => new Map());
  const addMutation = useAddProductsToVehicleMutation();

  const { data, isFetching, isLoading } = useQuery({
    queryKey: [...productKeys.lists(), "vehicle-picker", term],
    queryFn: () => fetchProducts({ name: term || undefined, page: 1, take: SEARCH_TAKE }),
    placeholderData: keepPreviousData,
  });
  const products = data?.items ?? [];

  const toggle = (product) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) next.delete(product.id);
      else next.set(product.id, product);
      return next;
    });

  const handleSubmit = () =>
    addMutation.mutate(
      { vehicleId: vehicle.id, productIds: [...picked.keys()] },
      { onSuccess: onClose },
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>افزودن کالا به «{vehicle.name}»</DialogTitle>
        <DialogDescription>
          کالاهایی که از قبل برای این خودرو ثبت شده‌اند دوباره اضافه نمی‌شوند.
        </DialogDescription>
      </DialogHeader>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="نام کالا..."
          className="pr-8"
          autoFocus
        />
      </div>

      <div
        className={cn(
          "-mx-1 max-h-[50svh] min-h-40 overflow-y-auto px-1 transition-opacity",
          isFetching && !isLoading && "opacity-60",
        )}
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">کالایی پیدا نشد.</p>
        ) : (
          <ul className="space-y-1.5">
            {products.map((product) => {
              const checked = picked.has(product.id);
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => toggle(product)}
                    aria-pressed={checked}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-2 text-start transition-colors",
                      checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {checked && <Check className="size-3.5" />}
                    </span>
                    <ProductThumb item={{ ...product, productName: product.name }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{product.name}</span>
                      <span className="block truncate text-xs text-muted-foreground" dir="auto">
                        {[product.code, product.brand, product.categoryName].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <DialogActions
        onCancel={onClose}
        onSubmit={handleSubmit}
        isPending={addMutation.isPending}
        disabled={picked.size === 0}
        pendingLabel="در حال افزودن..."
        submitLabel="افزودن"
      >
        {picked.size > 0 ? `${formatNumber(picked.size)} کالا انتخاب شده` : "کالایی انتخاب نشده"}
      </DialogActions>
    </>
  );
}

/** جست‌وجو و انتخابِ چند کالا برای یک خودرو. */
export default function AddProductsToVehicleDialog({ open, onOpenChange, vehicle }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="flex max-h-[90svh] flex-col gap-4 sm:max-w-lg">
        {vehicle && <AddProductsBody key={vehicle.id} vehicle={vehicle} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
