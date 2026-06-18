import { useCallback } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { useCustomerFilterStore } from "../store/customerFilterStore";

const CustomerFilters = () => {
  const {
    globalSearch,
    minDebtCredit,
    maxDebtCredit,
    setGlobalSearch,
    setDebtCreditRange,
    resetFilters,
    setQuickFilter,
  } = useCustomerFilterStore();

  const handleMinDebt = useCallback(
    (e) => setDebtCreditRange(e.target.value, maxDebtCredit),
    [maxDebtCredit, setDebtCreditRange]
  );
  const handleMaxDebt = useCallback(
    (e) => setDebtCreditRange(minDebtCredit, e.target.value),
    [minDebtCredit, setDebtCreditRange]
  );

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">
      {/* ردیف جستجو */}
      <div className="grid grid-cols-1 gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Label className="whitespace-nowrap font-light text-foreground">
            جستجو
          </Label>
          <Input
            placeholder="نام یا کد مشتری..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      {/* ردیف فیلتر محدوده + دکمه‌های سریع */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-border">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Label className="whitespace-nowrap font-light text-foreground">
              حداقل بدهی/طلب (تومان)
            </Label>
            <Input
              type="number"
              placeholder="از"
              value={minDebtCredit}
              onChange={handleMinDebt}
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Label className="whitespace-nowrap font-light text-foreground">
              حداکثر بدهی/طلب (تومان)
            </Label>
            <Input
              type="number"
              placeholder="تا"
              value={maxDebtCredit}
              onChange={handleMaxDebt}
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuickFilter("all")}
          >
            همه
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuickFilter("debtors")}
          >
            بدهکاران
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuickFilter("creditors")}
          >
            طلبکاران
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuickFilter("zero")}
          >
            بدون بدهی/طلب
          </Button>
        </div>

        <div className="flex flex-col items-end justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            className="w-full sm:w-auto px-4 mt-2"
          >
            حذف همه فیلترها
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomerFilters;
