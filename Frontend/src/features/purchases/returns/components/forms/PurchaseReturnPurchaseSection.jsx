// src/features/purchases/components/forms/PurchaseReturnPurchaseSection.jsx
import { useMemo, useState } from "react";
import { Search, X, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

export default function PurchaseReturnPurchaseSection({
  purchases = [],
  isLoading,
  selectedPurchase,
  onSelect,
  onClear,
  error,
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return purchases;
    const q = search.toLowerCase();
    return purchases.filter(
      (p) =>
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q),
    );
  }, [purchases, search]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          خرید مبدا
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {selectedPurchase ? (
          <div className="flex items-start sm:items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5 flex-col sm:flex-row">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground">
                {selectedPurchase.invoiceNumber} — {selectedPurchase.supplierName}
              </p>
              {selectedPurchase.invoiceDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  تاریخ فاکتور: {gregorianToPersian(selectedPurchase.invoiceDate)}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onClear}
              aria-label="تغییر خرید"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={
                  isLoading
                    ? "در حال بارگذاری..."
                    : "جست‌وجو با شماره فاکتور یا نام تامین‌کننده..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={isLoading}
                className={`input-rtl-placeholder pr-9 h-9 ${
                  error ? "border-destructive focus-visible:ring-destructive/30" : ""
                }`}
              />
            </div>

            {filtered.length > 0 ? (
              <ul className="max-h-64 overflow-y-auto custom-scroll rounded-lg border border-border divide-y divide-border bg-card">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(p.id)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-right hover:bg-accent/50 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-sm font-medium text-card-foreground truncate">
                          {p.invoiceNumber} — {p.supplierName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          تاریخ: {gregorianToPersian(p.invoiceDate)} |{" "}
                          {p.itemsCount.toLocaleString("fa-IR")} قلم
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              !isLoading && (
                <div className="rounded-lg border border-dashed border-border py-6">
                  <p className="text-xs text-muted-foreground text-center">
                    {search ? "خریدی یافت نشد" : "خریدی برای ثبت مرجوعی موجود نیست"}
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {error && !selectedPurchase && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}