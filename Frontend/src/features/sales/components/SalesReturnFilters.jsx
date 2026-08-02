import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Search, X, ChevronDown, Check } from "lucide-react";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import useSalesReturnFilterStore from "../store/salesReturnFilterStore";
import {
  SALES_RETURN_STATUS_LABELS,
  SALES_RETURN_REASON_LABELS,
} from "../services/returns/mockData";

const STATUS_OPTIONS = Object.entries(SALES_RETURN_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const REASON_OPTIONS = Object.entries(SALES_RETURN_REASON_LABELS).map(([value, label]) => ({
  value,
  label,
}));
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

const CustomerFilterInput = ({ value = [], onSelect, customers = [], isLoading = false }) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const getCustomerName = useCallback(
    (customer) =>
      customer.name ||
      customer.companyName ||
      [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
      "بدون نام",
    [],
  );

  const selectedCustomers = useMemo(
    () => customers.filter((c) => value.includes(c.id)),
    [customers, value],
  );

  const filtered = useMemo(() => {
    const search = (inputValue || "").trim();
    if (!search) return customers;
    const lower = search.toLowerCase();
    return customers.filter((c) => getCustomerName(c).toLowerCase().includes(lower));
  }, [inputValue, customers, getCustomerName]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = useCallback(
    (id) => onSelect(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]),
    [value, onSelect],
  );
  const handleRemove = useCallback(
    (id, e) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect(value.filter((v) => v !== id));
    },
    [value, onSelect],
  );
  const handleClear = useCallback(
    (e) => {
      e?.stopPropagation();
      setInputValue("");
      onSelect([]);
    },
    [onSelect],
  );
  const handleSelectAll = useCallback(() => {
    const targetList = inputValue.trim() ? filtered : customers;
    onSelect(targetList.map((c) => c.id));
    setIsOpen(false);
  }, [inputValue, filtered, customers, onSelect]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <Label className="whitespace-nowrap font-medium text-foreground text-sm sm:pt-2">
        مشتری
      </Label>
      <div ref={wrapperRef} className="relative flex-1">
        <div
          className="w-full bg-transparent rounded-lg border border-input px-3 py-2 text-sm cursor-pointer hover:border-ring transition-colors dark:bg-input/30 dark:hover:bg-input/50"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {selectedCustomers.length === 0 ? (
              <span className="text-muted-foreground">انتخاب مشتری...</span>
            ) : (
              <div className="flex flex-wrap gap-1 flex-1">
                {selectedCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs"
                  >
                    <span>{getCustomerName(customer)}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemove(customer.id, e)}
                      className="hover:bg-primary/20 rounded-sm p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mr-auto flex items-center gap-1 flex-shrink-0">
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="جستجو..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="pr-8 h-8"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                  در حال بارگذاری...
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                  مشتری‌ای یافت نشد
                </div>
              ) : (
                <div className="py-1">
                  <div className="px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {value.length} از {customers.length} انتخاب شده
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-xs text-primary hover:underline"
                      >
                        انتخاب همه
                      </button>
                      {value.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClear}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          پاک کردن
                        </button>
                      )}
                    </div>
                  </div>
                  {filtered.map((customer) => {
                    const name = getCustomerName(customer);
                    const isSelected = value.includes(customer.id);
                    return (
                      <button
                        key={customer.id}
                        type="button"
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${
                          isSelected ? "bg-accent/50" : ""
                        }`}
                        onClick={() => handleToggle(customer.id)}
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? "bg-primary border-primary" : "border-input"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="text-right flex-1">{name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DateInput = ({ label, value, onChange }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
    <Label className="whitespace-nowrap font-medium text-foreground text-sm">{label}</Label>
    <PersianDatePicker value={value} onChange={onChange} className="flex-1" />
  </div>
);

const SalesReturnFilters = ({ customers = [], isCustomersLoading = false }) => {
  const {
    globalSearch,
    customerIds,
    status,
    reason,
    fromDate,
    toDate,
    setGlobalSearch,
    setCustomerIds,
    setStatus,
    setReason,
    setFromDate,
    setToDate,
    resetFilters,
  } = useSalesReturnFilterStore();

  const handleGlobalSearch = useCallback((e) => setGlobalSearch(e.target.value), [setGlobalSearch]);

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="whitespace-nowrap font-medium text-foreground text-sm">جستجو</Label>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="شماره مرجوعی، فاکتور، مشتری..."
              value={globalSearch}
              onChange={handleGlobalSearch}
              className="pr-8"
            />
          </div>
        </div>

        <CustomerFilterInput
          value={customerIds}
          onSelect={setCustomerIds}
          customers={customers}
          isLoading={isCustomersLoading}
        />

        <FilterSelect
          label="وضعیت"
          value={status}
          onChange={setStatus}
          allLabel="همه وضعیت‌ها"
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="دلیل"
          value={reason}
          onChange={setReason}
          allLabel="همه دلایل"
          options={REASON_OPTIONS}
        />
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

export default SalesReturnFilters;
