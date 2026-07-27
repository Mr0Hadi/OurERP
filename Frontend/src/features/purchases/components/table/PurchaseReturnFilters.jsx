// src/features/purchases/components/table/PurchaseReturnFilters.jsx
import { useCallback } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Search } from "lucide-react";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import usePurchaseReturnFilterStore from "../../store/purchaseReturnFilterStore";
import {
  PURCHASE_RETURN_STATUS_LABELS,
  PURCHASE_RETURN_REASON_LABELS,
} from "../../services/returns/mockData";

const STATUS_OPTIONS = Object.entries(PURCHASE_RETURN_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const REASON_OPTIONS = Object.entries(PURCHASE_RETURN_REASON_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const normalize = (value) => (value === "all" ? "" : value);

const FilterSelect = ({ label, value, onChange, allLabel = "همه", options }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
    <Label className="whitespace-nowrap font-medium text-foreground text-sm">{label}</Label>
    <Select value={value || "all"} onValueChange={(v) => onChange(normalize(v))}>
      <SelectTrigger className="flex-1 w-full">
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const DateInput = ({ label, value, onChange }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
    <Label className="whitespace-nowrap font-medium text-foreground text-sm">{label}</Label>
    <PersianDatePicker value={value} onChange={onChange} className="flex-1" />
  </div>
);

const PurchaseReturnFilters = () => {
  const {
    globalSearch,
    status,
    reason,
    fromDate,
    toDate,
    setGlobalSearch,
    setStatus,
    setReason,
    setFromDate,
    setToDate,
    resetFilters,
  } = usePurchaseReturnFilterStore();

  const handleGlobalSearch = useCallback((e) => setGlobalSearch(e.target.value), [setGlobalSearch]);

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="whitespace-nowrap font-medium text-foreground text-sm">جستجو</Label>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="شماره مرجوعی، فاکتور، تامین‌کننده..."
              value={globalSearch}
              onChange={handleGlobalSearch}
              className="pr-8"
            />
          </div>
        </div>

        <FilterSelect label="وضعیت" value={status} onChange={setStatus} allLabel="همه وضعیت‌ها" options={STATUS_OPTIONS} />
        <FilterSelect label="دلیل" value={reason} onChange={setReason} allLabel="همه دلایل" options={REASON_OPTIONS} />
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t border-border">
        <DateInput label="از تاریخ" value={fromDate} onChange={setFromDate} />
        <DateInput label="تا تاریخ" value={toDate} onChange={setToDate} />
        <div className="flex items-end xs:col-span-2 lg:col-span-1 lg:justify-end">
          <Button type="button" variant="outline" onClick={resetFilters} className="w-full px-4">
            حذف همه فیلترها
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseReturnFilters;