import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { getPartyName } from "./filterUtils";

/**
 * انتخابِ *یک* موجودیت از یک لیست، با جست‌وجوی داخلی.
 *
 * پیش از این چندانتخابی بود، ولی هیچ‌کدام از endpointهای لیست بیش از
 * یک شناسه نمی‌گیرند (`GetPurchaseList` فقط `SupplierId` تکی،
 * `GetSaleReturnList` فقط `customerId`). نتیجه‌اش این بود که کاربر سه
 * تامین‌کننده انتخاب می‌کرد و لایه‌ی API بی‌صدا `[0]` را می‌فرستاد —
 * یعنی فیلتر چیزی را نشان می‌داد که واقعاً اعمال نشده بود.
 *
 * بقیه‌ی فیلترهای این پنل هم تک‌انتخابی‌اند (`FilterSelect`)؛ این یکی
 * فقط به‌خاطر تعدادِ زیادِ گزینه‌ها جست‌وجو دارد.
 *
 * props:
 *  label, placeholder, emptyText - متن‌های فارسی مخصوص هر صفحه
 *  items                         - لیست کامل گزینه‌ها
 *  value                         - کلیدِ انتخاب‌شده، یا "" برای «همه»
 *  onSelect                      - (nextKey, item) => void ("" یعنی پاک‌کردن)
 *                                  `item` برای فیلترهایی است که سرور
 *                                  به‌جای شناسه، نام می‌خواهد.
 *  isLoading                     - در حال دریافت لیست
 *  getKey, getLabel              - استخراج کلید و برچسب هر گزینه
 *  renderMeta                    - اطلاعات فرعی کنار هر گزینه (اختیاری)
 */
export default function EntitySelect({
  label,
  placeholder,
  emptyText = "موردی یافت نشد",
  items = [],
  value = "",
  onSelect,
  isLoading = false,
  getKey = (item) => item.id,
  getLabel = getPartyName,
  renderMeta,
}) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedItem = useMemo(
    () =>
      value === "" || value == null
        ? null
        : items.find((item) => String(getKey(item)) === String(value)) || null,
    [items, value, getKey],
  );

  const filtered = useMemo(() => {
    const search = (inputValue || "").trim().toLowerCase();
    if (!search) return items;
    return items.filter((item) => getLabel(item).toLowerCase().includes(search));
  }, [inputValue, items, getLabel]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // انتخابِ گزینه‌ی فعلی یعنی «برداشتنِ فیلتر» — همان رفتاری که کلیک
  // دوباره روی یک رادیو انتظار می‌رود، و راهِ برگشت به «همه» بدون
  // رفتن سراغ ضربدرِ کنارِ فیلد.
  const handleSelect = useCallback(
    (key, item) => {
      const isUnset = String(key) === String(value);
      onSelect(isUnset ? "" : key, isUnset ? null : item);
      setInputValue("");
      setIsOpen(false);
    },
    [onSelect, value],
  );

  const handleClear = useCallback(
    (e) => {
      e?.stopPropagation();
      setInputValue("");
      onSelect("", null);
    },
    [onSelect],
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <Label className="whitespace-nowrap font-medium text-foreground text-sm sm:pt-2">
        {label}
      </Label>

      <div ref={wrapperRef} className="relative flex-1">
        <div
          className="w-full bg-transparent rounded-lg border border-input px-3 py-2 text-sm cursor-pointer hover:border-ring transition-colors dark:bg-input/30 dark:hover:bg-input/50"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            {selectedItem ? (
              <span className="flex-1 truncate">{getLabel(selectedItem)}</span>
            ) : (
              <span className="flex-1 text-muted-foreground">{placeholder}</span>
            )}

            <div className="flex items-center gap-1 flex-shrink-0">
              {selectedItem && (
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
                  {emptyText}
                </div>
              ) : (
                <div className="py-1">
                  <button
                    type="button"
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${
                      selectedItem ? "" : "bg-accent/50"
                    }`}
                    onClick={() => handleSelect("")}
                  >
                    <div className="h-4 w-4 flex items-center justify-center flex-shrink-0">
                      {!selectedItem && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="text-right flex-1 text-muted-foreground">
                      {placeholder}
                    </span>
                  </button>

                  {filtered.map((item) => {
                    const key = getKey(item);
                    const isSelected = String(key) === String(value);

                    return (
                      <button
                        key={key}
                        type="button"
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${
                          isSelected ? "bg-accent/50" : ""
                        }`}
                        onClick={() => handleSelect(key, item)}
                      >
                        <div className="h-4 w-4 flex items-center justify-center flex-shrink-0">
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                        <span className="text-right flex-1">
                          {getLabel(item)}
                        </span>
                        {renderMeta?.(item)}
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
}
