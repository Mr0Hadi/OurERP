import { useCallback, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/components/ui/popover";
import { getPartyName } from "./filterUtils";
import { isTouchDevice } from "@/shared/lib/isTouchDevice";

/**
 * انتخابِ *یک* موجودیت از یک لیست، با جست‌وجوی داخلی.
 *
 * تک‌انتخابی است و باید بماند: هیچ‌کدام از endpointهای لیست بیش از یک
 * شناسه نمی‌گیرند (`GetPurchaseList` فقط `SupplierId`،
 * `GetSaleReturnList` فقط `customerId`). چندانتخابی یعنی کاربر سه
 * تامین‌کننده انتخاب کند و لایه‌ی API بی‌صدا `[0]` را بفرستد — فیلتری
 * که چیزی را نشان می‌دهد ولی اعمال نشده.
 *
 * تفاوتش با `FilterSelect` فقط جست‌وجوی داخلی است، برای وقتی گزینه‌ها
 * زیادند.
 *
 * @param value    کلیدِ انتخاب‌شده، یا `""` برای «همه».
 * @param onSelect `(nextKey, item) => void`؛ `""` یعنی پاک‌کردن.
 *                                  `item` برای فیلترهایی است که سرور
 *                                  به‌جای شناسه، نام می‌خواهد.
 *  isLoading                     - در حال دریافت لیست
 *  allowClear                    - `false` برای فیلدِ اجباریِ فرم: ردیفِ «همه»، ضربدر و
 *                                  برداشتنِ انتخاب با کلیکِ دوباره حذف می‌شود
 *  label                         - اختیاری؛ فرم‌ها برچسبِ خودشان را دارند
 *  getKey, getLabel              - استخراج کلید و برچسب هر گزینه
 *  renderMeta                    - اطلاعات فرعی کنار هر گزینه (اختیاری)
 *  onSearchChange                - حالتِ جست‌وجوی سرور: متنِ جست‌وجو به والد می‌رود و
 *                                  `items` همان نتیجه‌ی سرور است (اینجا دوباره فیلتر نمی‌شود)
 *  onOpenChange                  - باز/بسته‌شدنِ فهرست؛ تا بسته است والد چیزی نمی‌گیرد
 *  selected                      - گزینه‌ی انتخاب‌شده وقتی شاید در `items` نباشد (جست‌وجوی سرور)
 *
 * فهرست در پورتال (`Popover`) باز می‌شود، نه `absolute` داخلِ والد؛ وگرنه
 * داخلِ کارتِ `overflow-hidden` (مثلِ بخشِ اقلامِ فرمِ خرید/فروش) بریده می‌شد.
 */
export default function EntitySelect({
  label,
  placeholder,
  emptyText = "موردی یافت نشد",
  items = [],
  value = "",
  onSelect,
  isLoading = false,
  allowClear = true,
  getKey = (item) => item.id,
  getLabel = getPartyName,
  renderMeta,
  onSearchChange,
  onOpenChange,
  selected,
}) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setOpenState] = useState(false);
  const fieldRef = useRef(null);
  const isRemote = Boolean(onSearchChange);

  const setSearch = useCallback(
    (text) => {
      setInputValue(text);
      onSearchChange?.(text);
    },
    [onSearchChange],
  );

  const setIsOpen = useCallback(
    (open) => {
      setOpenState(open);
      onOpenChange?.(open);
    },
    [onOpenChange],
  );

  const selectedItem = useMemo(() => {
    if (value === "" || value == null) return null;
    const inItems = items.find((item) => String(getKey(item)) === String(value));
    if (inItems) return inItems;
    return selected && String(getKey(selected)) === String(value) ? selected : null;
  }, [items, value, getKey, selected]);

  const filtered = useMemo(() => {
    const search = (inputValue || "").trim().toLowerCase();
    if (!search || isRemote) return items;
    return items.filter((item) => getLabel(item).toLowerCase().includes(search));
  }, [inputValue, items, getLabel, isRemote]);

  // انتخابِ گزینه‌ی فعلی یعنی «برداشتنِ فیلتر» — همان رفتاری که کلیک
  // دوباره روی یک رادیو انتظار می‌رود، و راهِ برگشت به «همه» بدون
  // رفتن سراغ ضربدرِ کنارِ فیلد. فیلدِ اجباری (`allowClear={false}`) انتخابش
  // را نگه می‌دارد.
  const handleSelect = useCallback(
    (key, item) => {
      const isUnset = allowClear && String(key) === String(value);
      onSelect(isUnset ? "" : key, isUnset ? null : item);
      setSearch("");
      setIsOpen(false);
    },
    [onSelect, value, allowClear, setSearch, setIsOpen],
  );

  const handleClear = useCallback(
    (e) => {
      e?.stopPropagation();
      setSearch("");
      onSelect("", null);
    },
    [onSelect, setSearch],
  );

  return (
    <div className="flex min-w-0 flex-col sm:flex-row sm:items-center gap-2">
      {label && (
        <Label className="whitespace-nowrap font-medium text-foreground text-sm">
          {label}
        </Label>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverAnchor asChild>
          <div
            ref={fieldRef}
            data-slot="entity-select-trigger"
            className="flex h-8 w-full min-w-0 sm:flex-1 items-center bg-transparent rounded-lg border border-input px-3 text-sm cursor-pointer hover:border-ring transition-colors dark:bg-input/30 dark:hover:bg-input/50"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {selectedItem ? (
                <span className="min-w-0 flex-1 truncate">{getLabel(selectedItem)}</span>
              ) : (
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{placeholder}</span>
              )}

              <div className="flex items-center gap-1 flex-shrink-0">
                {allowClear && selectedItem && (
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
        </PopoverAnchor>

        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
          // روی صفحه‌ی لمسی، Radix اولین input (جست‌وجو) را فوکوس می‌کرد و کیبورد
          // بالا می‌آمد؛ جست‌وجو فقط وقتی کاربر خودش رویش بزند فعال می‌شود.
          onOpenAutoFocus={(event) => {
            if (!isTouchDevice()) return;
            event.preventDefault();
            event.currentTarget.focus();
          }}
          // کلیک روی خودِ فیلد را `onClick`ِ فیلد باز/بسته می‌کند، نه بستنِ بیرونی.
          onInteractOutside={(event) => {
            if (fieldRef.current?.contains(event.target)) event.preventDefault();
          }}
        >
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="جستجو..."
                value={inputValue}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-8 h-8"
                autoFocus={!isTouchDevice()}
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
                {allowClear && (
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
                )}

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
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <span className="text-right flex-1">{getLabel(item)}</span>
                      {renderMeta?.(item)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
