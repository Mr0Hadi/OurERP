import { useCallback, useEffect, useRef, useState } from "react";
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
import { Search, X, ChevronDown } from "lucide-react";
import useReceivingFilterStore from "../../store/receivingFilterStore";
import { PAYMENT_TYPE_LABELS } from "@/features/purchases/services/constants";
import { RECEIVING_STATUS_LABELS } from "../../services/api";
import { useMemo } from "react";
import { Check } from "lucide-react";

// ─── ثابت‌ها ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = Object.entries(RECEIVING_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const PAYMENT_TYPE_OPTIONS = Object.entries(PAYMENT_TYPE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const normalize = (value) => (value === "all" ? "" : value);

// ─── Sub-components ───────────────────────────────────────────────────────────

const FilterSelect = ({
  label,
  value,
  onChange,
  allLabel = "همه",
  options,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
    <Label className="whitespace-nowrap font-medium text-foreground text-sm">
      {label}
    </Label>
    <Select
      value={value || "all"}
      onValueChange={(v) => onChange(normalize(v))}
    >
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

/**
 * Input جستجو + Dropdown انتخاب تامین‌کننده از API
 */
const SupplierFilterInput = ({
  value = [],
  onSelect,
  suppliers = [],
  isLoading = false,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const getSupplierName = useCallback((supplier) => {
    return (
      supplier.name ||
      supplier.companyName ||
      [supplier.firstName, supplier.lastName].filter(Boolean).join(" ") ||
      "بدون نام"
    );
  }, []);

  const selectedSuppliers = useMemo(
    () => suppliers.filter((s) => value.includes(s.id)),
    [suppliers, value],
  );

  const filtered = useMemo(() => {
    const search = (inputValue || "").trim();
    if (!search) return suppliers;
    const lower = search.toLowerCase();
    return suppliers.filter((s) => {
      const name = getSupplierName(s);
      return name.toLowerCase().includes(lower);
    });
  }, [inputValue, suppliers, getSupplierName]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = useCallback(
    (supplierId) => {
      const newValue = value.includes(supplierId)
        ? value.filter((id) => id !== supplierId)
        : [...value, supplierId];
      onSelect(newValue);
    },
    [value, onSelect],
  );

  const handleRemove = useCallback(
    (supplierId, e) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect(value.filter((id) => id !== supplierId));
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
    const targetList = inputValue.trim() ? filtered : suppliers;
    onSelect(targetList.map((s) => s.id));
    setIsOpen(false);
  }, [inputValue, filtered, suppliers, onSelect]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <Label className="whitespace-nowrap font-medium text-foreground text-sm sm:pt-2">
        تامین‌کننده
      </Label>

      <div ref={wrapperRef} className="relative flex-1">
        <div className="relative">
          <div
            className="w-full bg-transparent rounded-lg border border-input px-3 py-2 text-sm cursor-pointer hover:border-ring transition-colors dark:bg-input/30 dark:hover:bg-input/50"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {selectedSuppliers.length === 0 ? (
                <span className="text-muted-foreground">
                  انتخاب تامین‌کننده...
                </span>
              ) : (
                <div className="flex flex-wrap gap-1 flex-1">
                  {selectedSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs"
                    >
                      <span>{getSupplierName(supplier)}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemove(supplier.id, e)}
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
                  تامین‌کننده‌ای یافت نشد
                </div>
              ) : (
                <div className="py-1">
                  <div className="px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {value.length} از {suppliers.length} انتخاب شده
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

                  {filtered.map((supplier) => {
                    const name = getSupplierName(supplier);
                    const isSelected = value.includes(supplier.id);

                    return (
                      <button
                        key={supplier.id}
                        type="button"
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${
                          isSelected ? "bg-accent/50" : ""
                        }`}
                        onClick={() => handleToggle(supplier.id)}
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-input"
                          }`}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <span className="text-right flex-1">{name}</span>
                        {supplier.phone && (
                          <span className="text-xs text-muted-foreground">
                            {supplier.phone}
                          </span>
                        )}
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
    <Label className="whitespace-nowrap font-medium text-foreground text-sm">
      {label}
    </Label>
    <Input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1"
    />
  </div>
);

// ─── کامپوننت اصلی ────────────────────────────────────────────────────────────

/**
 * props:
 *  - suppliers: آرایه { id, name } از API
 *  - isSuppliersLoading: boolean
 */
const ReceivingFilters = ({ suppliers = [], isSuppliersLoading = false }) => {
  const {
    globalSearch,
    supplierIds,
    status,
    paymentType,
    fromDate,
    toDate,
    setGlobalSearch,
    setSupplierIds,
    setStatus,
    setPaymentType,
    setFromDate,
    setToDate,
    resetFilters,
  } = useReceivingFilterStore();

  const handleGlobalSearch = useCallback(
    (e) => setGlobalSearch(e.target.value),
    [setGlobalSearch],
  );

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">
      {/* ردیف اول */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* جستجو */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="whitespace-nowrap font-medium text-foreground text-sm">
            جستجو
          </Label>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="شماره فاکتور، توضیحات..."
              value={globalSearch}
              onChange={handleGlobalSearch}
              className="pr-8"
            />
          </div>
        </div>

        <SupplierFilterInput
          value={supplierIds}
          onSelect={setSupplierIds}
          suppliers={suppliers}
          isLoading={isSuppliersLoading}
        />

        <FilterSelect
          label="وضعیت"
          value={status}
          onChange={setStatus}
          allLabel="همه وضعیت‌ها"
          options={STATUS_OPTIONS}
        />

        <FilterSelect
          label="نوع پرداخت"
          value={paymentType}
          onChange={setPaymentType}
          allLabel="همه"
          options={PAYMENT_TYPE_OPTIONS}
        />
      </div>

      {/* ردیف دوم: تاریخ + دکمه ریست */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t border-border">
        <DateInput label="از تاریخ" value={fromDate} onChange={setFromDate} />
        <DateInput label="تا تاریخ" value={toDate} onChange={setToDate} />

        <div className="flex items-end xs:col-span-2 lg:col-span-1 lg:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            className="w-full px-4"
          >
            حذف همه فیلترها
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReceivingFilters;
