import { useCallback } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";
import { useSupplierFilterStore } from "../store/supplierFilterStore";

const SupplierFilters = () => {
  const {
    globalSearch,
    minDebtCredit,
    maxDebtCredit,
    setGlobalSearch,
    setDebtCreditRange,
    resetFilters,
    setQuickFilter,
  } = useSupplierFilterStore();

  const handleMinDebt = useCallback(
    (next) => setDebtCreditRange(next ?? "", maxDebtCredit),
    [maxDebtCredit, setDebtCreditRange]
  );
  const handleMaxDebt = useCallback(
    (next) => setDebtCreditRange(minDebtCredit, next ?? ""),
    [minDebtCredit, setDebtCreditRange]
  );

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">
      <div className="grid grid-cols-1 gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Label className="whitespace-nowrap font-light text-foreground">
            جستجو
          </Label>
          <Input
            placeholder="نام شرکت، رابط یا کد تامین‌کننده..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-border">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Label className="whitespace-nowrap font-light text-foreground">
              حداقل تراز (ریال)
            </Label>
            <PriceInput
              placeholder="از"
              value={minDebtCredit === "" ? null : Number(minDebtCredit)}
              onValueChange={handleMinDebt}
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Label className="whitespace-nowrap font-light text-foreground">
              حداکثر تراز (ریال)
            </Label>
            <PriceInput
              placeholder="تا"
              value={maxDebtCredit === "" ? null : Number(maxDebtCredit)}
              onValueChange={handleMaxDebt}
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setQuickFilter("all")}>همه</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuickFilter("debtors")}>بدهکاران</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuickFilter("creditors")}>بستانکاران</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuickFilter("zero")}>بی‌حساب</Button>
        </div>

        <div className="flex flex-col items-end justify-between">
          <Button type="button" variant="outline" onClick={resetFilters} className="w-full sm:w-auto px-4 mt-2">
            حذف همه فیلترها
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierFilters;
