// src/features/purchases/components/PurchaseSupplierSection.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, X, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ROUTES } from "@/shared/constants/routes";

/**
 * props:
 *  suppliers     - آرایه { id, companyName, firstName, lastName, avatar }
 *  isLoading     - وضعیت لود لیست تامین‌کنندگان
 *  selectedId    - مقدار فعلی
 *  onSelect      - (id, name) => void
 *  onClear       - () => void
 *  error         - پیام خطا
 */
export default function PurchaseSupplierSection({
  suppliers = [],
  isLoading,
  selectedId,
  onSelect,
  onClear,
  error,
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleAddNew = () => {
    navigate(ROUTES.SUPPLIERS_NEW, { state: { returnTo: ROUTES.PURCHASES_NEW } });
  };

  const selectedSupplier = suppliers.find((s) => s.id === selectedId);
  const displayName = selectedSupplier
    ? selectedSupplier.companyName ||
      `${selectedSupplier.firstName} ${selectedSupplier.lastName}`
    : "";

  // فیلتر بر اساس نام، نام خانوادگی و نام شرکت
  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.companyName?.toLowerCase().includes(q) ||
        s.firstName?.toLowerCase().includes(q) ||
        s.lastName?.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const handleSelect = (supplier) => {
    const name =
      supplier.companyName ||
      `${supplier.firstName} ${supplier.lastName}`;
    onSelect(supplier.id, name);
    setSearch("");
  };

  return (
    <Card>
      {/* هدر با دکمه افزودن در کنار عنوان */}
      <CardHeader className="pb-1 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-card-foreground">
          تامین‌کننده
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8 px-3"
          onClick={handleAddNew}
        >
          <UserPlus className="h-4 w-4" />
          افزودن تامین‌کننده جدید
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* تامین‌کننده انتخاب‌شده */}
        {selectedSupplier ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
            {selectedSupplier.avatar ? (
              <img
                src={selectedSupplier.avatar}
                alt={displayName}
                className="h-9 w-9 rounded-full object-cover border border-border shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {(selectedSupplier.companyName?.[0] ?? selectedSupplier.firstName?.[0] ?? "؟")}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground truncate">
                {displayName}
              </p>
              {selectedSupplier.companyName && (
                <p className="text-xs text-muted-foreground truncate">
                  {selectedSupplier.firstName} {selectedSupplier.lastName}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => {
                onClear();
                setSearch("");
              }}
              aria-label="حذف انتخاب"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          /* باکس جست‌وجو — فقط وقتی تامین‌کننده انتخاب نشده */
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={isLoading ? "در حال بارگذاری..." : "جست‌وجوی نام یا شرکت..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={isLoading}
                className={`input-rtl-placeholder pr-9 h-9 ${
                  error ? "border-destructive focus-visible:ring-destructive/30" : ""
                }`}
              />
            </div>

            {/* لیست نتایج */}
            {filteredSuppliers.length > 0 ? (
              <ul className="max-h-52 overflow-y-auto custom-scroll rounded-lg border border-border divide-y divide-border bg-card">
                {filteredSuppliers.map((s) => {
                  const name =
                    s.companyName || `${s.firstName} ${s.lastName}`;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(s)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-right hover:bg-accent/50 transition-colors"
                      >
                        {s.avatar ? (
                          <img
                            src={s.avatar}
                            alt={name}
                            className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {(s.companyName?.[0] ?? s.firstName?.[0] ?? "؟")}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-sm font-medium text-card-foreground truncate">
                            {name}
                          </p>
                          {s.companyName && (
                            <p className="text-xs text-muted-foreground truncate">
                              {s.firstName} {s.lastName}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              !isLoading && (
                <div className="rounded-lg border border-dashed border-border py-6">
                  <p className="text-xs text-muted-foreground text-center">
                    {search ? "تامین‌کننده‌ای یافت نشد" : "لیست تامین‌کنندگان خالی است"}
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {error && !selectedId && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
