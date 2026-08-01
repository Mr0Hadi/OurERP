import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Search, X, ChevronDown, Check } from "lucide-react";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import useReceivingFilterStore from "../../store/receivingFilterStore";
import { INCOMING_TYPE_LABELS } from "../../services/incomingQueueApi";

const TYPE_OPTIONS = Object.entries(INCOMING_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const normalize = (value) => (value === "all" ? "" : value);

// ادغام مشتری‌ها و تامین‌کنندگان در یک select — چون در این صفحه هم
// خرید (طرف: تامین‌کننده) و هم مرجوعی فروش (طرف: مشتری) دیده می‌شود.
const CounterpartyFilterInput = ({ value = [], onSelect, parties = [], isLoading = false }) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedParties = useMemo(() => parties.filter((p) => value.includes(p.key)), [parties, value]);

  const filtered = useMemo(() => {
    const search = (inputValue || "").trim().toLowerCase();
    if (!search) return parties;
    return parties.filter((p) => p.name.toLowerCase().includes(search));
  }, [inputValue, parties]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = useCallback(
    (key) => onSelect(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]),
    [value, onSelect],
  );
  const handleRemove = useCallback((key, e) => { e.stopPropagation(); e.preventDefault(); onSelect(value.filter((v) => v !== key)); }, [value, onSelect]);
  const handleClear = useCallback((e) => { e?.stopPropagation(); setInputValue(""); onSelect([]); }, [onSelect]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <Label className="whitespace-nowrap font-medium text-foreground text-sm sm:pt-2">مشتری / تامین‌کننده</Label>
      <div ref={wrapperRef} className="relative flex-1">
        <div
          className="w-full bg-transparent rounded-lg border border-input px-3 py-2 text-sm cursor-pointer hover:border-ring transition-colors dark:bg-input/30 dark:hover:bg-input/50"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {selectedParties.length === 0 ? (
              <span className="text-muted-foreground">انتخاب طرف حساب...</span>
            ) : (
              <div className="flex flex-wrap gap-1 flex-1">
                {selectedParties.map((p) => (
                  <div key={p.key} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs">
                    <span>{p.name}</span>
                    <span className="text-[10px] opacity-70">({p.type === "customer" ? "مشتری" : "تامین‌کننده"})</span>
                    <button type="button" onClick={(e) => handleRemove(p.key, e)} className="hover:bg-primary/20 rounded-sm p-0.5 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mr-auto flex items-center gap-1 flex-shrink-0">
              {value.length > 0 && (
                <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input placeholder="جستجو..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="pr-8 h-8" autoFocus />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">در حال بارگذاری...</div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">موردی یافت نشد</div>
              ) : (
                <div className="py-1">
                  {filtered.map((p) => {
                    const isSelected = value.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${isSelected ? "bg-accent/50" : ""}`}
                        onClick={() => handleToggle(p.key)}
                      >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-primary border-primary" : "border-input"}`}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="text-right flex-1">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground">{p.type === "customer" ? "مشتری" : "تامین‌کننده"}</span>
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

const ReceivingFilters = ({ parties = [], isPartiesLoading = false }) => {
  const {
    globalSearch, type, counterpartyIds, fromDate, toDate,
    setGlobalSearch, setType, setCounterpartyIds, setFromDate, setToDate, resetFilters,
  } = useReceivingFilterStore();

  const handleGlobalSearch = useCallback((e) => setGlobalSearch(e.target.value), [setGlobalSearch]);

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">
      {/* ردیف اول: جستجو + طرف حساب + نوع */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="whitespace-nowrap font-medium text-foreground text-sm">جستجو</Label>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input placeholder="نام تامین‌کننده/مشتری، شماره فاکتور/مرجوعی..." value={globalSearch} onChange={handleGlobalSearch} className="pr-8" />
          </div>
        </div>

        <CounterpartyFilterInput value={counterpartyIds} onSelect={setCounterpartyIds} parties={parties} isLoading={isPartiesLoading} />

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="whitespace-nowrap font-medium text-foreground text-sm">نوع</Label>
          <Select value={type || "all"} onValueChange={(v) => setType(normalize(v))}>
            <SelectTrigger className="flex-1 w-full"><SelectValue placeholder="همه (خرید و مرجوعی)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه (خرید و مرجوعی)</SelectItem>
              {TYPE_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ردیف دوم: بازه‌ی تاریخ + ریست */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-border">
        <DateInput label="از تاریخ" value={fromDate} onChange={setFromDate} />
        <DateInput label="تا تاریخ" value={toDate} onChange={setToDate} />
        <div className="flex items-end sm:col-span-2 lg:col-span-2 lg:justify-end">
          <Button type="button" variant="outline" onClick={resetFilters} className="w-full lg:w-auto px-4">
            حذف همه فیلترها
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReceivingFilters;