import { useMemo, useRef, useState } from "react";
import { Car, Check, ChevronDown, Plus, Search, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/components/ui/popover";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { cn } from "@/shared/lib/utils";
import { useVehiclesQuery } from "../services/queries";
import VehicleFormDialog from "./VehicleFormDialog";

/**
 * خودروهای یک کالا (چندانتخابی). فهرستِ خالی یعنی «همه‌ی خودروها» — همان
 * قراردادِ سرور — پس این حالت جدا و صریح نشان داده می‌شود، نه به‌شکلِ فیلدِ خالی.
 *
 * @param value    آرایه‌ی شناسه‌ها (عدد)
 * @param onChange `(ids) => void`
 */
export default function VehicleMultiSelect({ value = [], onChange }) {
  const { can } = usePermission();
  const canManage = can(["VehicleManage", "ProductCategoryManage"]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fieldRef = useRef(null);

  const { data, isLoading } = useVehiclesQuery();
  const vehicles = useMemo(() => data?.items ?? [], [data]);

  const nameOf = useMemo(() => new Map(vehicles.map((v) => [v.id, v.name])), [vehicles]);

  const selected = new Set(value.map(Number));
  const filtered = vehicles.filter((v) =>
    v.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const isUniversal = selected.size === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverAnchor asChild>
            <button
              ref={fieldRef}
              type="button"
              onClick={() => setIsOpen((o) => !o)}
              className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors hover:border-ring dark:bg-input/30"
            >
              <Car className="size-4 shrink-0 text-muted-foreground" />
              <span className={cn("flex-1 truncate text-start", isUniversal && "text-muted-foreground")}>
                {isUniversal ? "همه‌ی خودروها" : `${selected.size.toLocaleString("fa-IR")} خودرو انتخاب شده`}
              </span>
              <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </button>
          </PopoverAnchor>
          <PopoverContent
            align="start"
            className="w-(--radix-popover-trigger-width) min-w-64 p-0"
            onInteractOutside={(event) => {
              if (fieldRef.current?.contains(event.target)) event.preventDefault();
            }}
          >
            <div className="border-b p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="جستجوی خودرو..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pr-8"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => onChange([])}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent",
                  isUniversal && "bg-accent/50",
                )}
              >
                <span className="flex size-4 items-center justify-center">
                  {isUniversal && <Check className="size-3.5 text-primary" />}
                </span>
                <span className="flex-1 text-start">همه‌ی خودروها</span>
                <span className="text-[11px] text-muted-foreground">بدون محدودیت</span>
              </button>
              <div className="mx-2 my-1 border-t border-border" />
              {isLoading ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">در حال بارگذاری...</p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {vehicles.length === 0 ? "هنوز خودرویی تعریف نشده" : "خودرویی یافت نشد"}
                </p>
              ) : (
                filtered.map((vehicle) => {
                  const checked = selected.has(vehicle.id);
                  return (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => toggle(vehicle.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent",
                        checked && "bg-accent/50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                        )}
                      >
                        {checked && <Check className="size-3" />}
                      </span>
                      <span className="flex-1 truncate text-start">{vehicle.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        {canManage && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="افزودن خودروی جدید"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {isUniversal ? (
        <p className="text-[11px] text-muted-foreground">
          کالایی که خودرویی برایش انتخاب نشود، برای همه‌ی خودروها حساب می‌شود.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {[...selected].map((id) => (
            <span
              key={id}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/50 py-0.5 pr-2.5 pl-1 text-xs"
            >
              <span className="truncate">{nameOf.get(id) ?? `خودرو ${id}`}</span>
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-label={`برداشتن ${nameOf.get(id) ?? ""}`}
                className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <VehicleFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSaved={(vehicle) => vehicle?.id && onChange([...selected, vehicle.id])}
      />
    </div>
  );
}
