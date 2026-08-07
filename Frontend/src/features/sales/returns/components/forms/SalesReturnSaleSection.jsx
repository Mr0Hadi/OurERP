// src/features/sales/components/forms/SalesReturnSaleSection.jsx
import { useState, useMemo } from "react";
import { Search, X, FileText, User, Calendar } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { useReturnableSalesQuery } from "../../services/queries";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

/**
 * props:
 *  selectedSale — فروش انتخاب‌شده (یا null)
 *  onSelect(saleId) — انتخاب یک فروش
 *  onClear() — پاک‌کردن انتخاب
 */
export default function SalesReturnSaleSection({ selectedSale, onSelect, onClear }) {
  const [search, setSearch] = useState("");
  const { data: sales = [], isLoading } = useReturnableSalesQuery(search);

  const filteredSales = useMemo(() => sales, [sales]);

  if (selectedSale) {
    return (
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            فروش انتخاب‌شده
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onClear}
            aria-label="تغییر فروش"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">شماره فاکتور</span>
            <span className="font-mono font-medium">{selectedSale.invoiceNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">مشتری</span>
            <span className="font-medium">{selectedSale.customerName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">تاریخ فاکتور</span>
            <span className="font-medium">{gregorianToPersian(selectedSale.invoiceDate)}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          انتخاب فاکتور فروش
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          فقط فروش‌هایی که به مشتری تحویل داده شده‌اند قابل انتخاب برای مرجوعی‌اند.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="جست‌وجو با شماره فاکتور یا نام مشتری..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-rtl-placeholder pr-9 h-9"
          />
        </div>

        {isLoading && (
          <p className="text-center text-sm text-muted-foreground py-6">در حال جست‌وجو...</p>
        )}

        {!isLoading && filteredSales.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">فروشی یافت نشد</p>
        )}

        {!isLoading && filteredSales.length > 0 && (
          <ul className="max-h-72 overflow-y-auto custom-scroll rounded-lg border border-border divide-y divide-border bg-card">
            {filteredSales.map((sale) => (
              <li key={sale.id}>
                <button
                  type="button"
                  onClick={() => onSelect(sale.id)}
                  className="flex items-center justify-between w-full px-3 py-2.5 text-right hover:bg-accent/50 transition-colors gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-card-foreground text-sm truncate flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {sale.invoiceNumber}
                    </p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                      <User className="h-3 w-3 shrink-0" />
                      {sale.customerName}
                    </p>
                  </div>
                  <div className="text-left shrink-0 space-y-1">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Calendar className="h-3 w-3" />
                      {gregorianToPersian(sale.invoiceDate)}
                    </Badge>
                    <p className="text-xs font-medium text-card-foreground tabular-nums">
                      {sale.totalAmount.toLocaleString("fa-IR")}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
