import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { getPartyName } from "./filterUtils";

/**
 * انتخاب چندتایی از یک لیست موجودیت با جست‌وجوی داخلی.
 *
 * props:
 *  label, placeholder, emptyText - متن‌های فارسی مخصوص هر صفحه
 *  items                         - لیست کامل گزینه‌ها
 *  value                         - آرایه‌ی کلیدهای انتخاب‌شده
 *  onSelect                      - (nextKeys) => void
 *  isLoading                     - در حال دریافت لیست
 *  getKey, getLabel              - استخراج کلید و برچسب هر گزینه
 *  renderMeta, renderChipMeta    - اطلاعات فرعی کنار گزینه/چیپ (اختیاری)
 *  showSelectAll                 - نمایش نوار شمارش و «انتخاب همه»
 */
export default function EntityMultiSelect({
  label,
  placeholder,
  emptyText = "موردی یافت نشد",
  items = [],
  value = [],
  onSelect,
  isLoading = false,
  getKey = (item) => item.id,
  getLabel = getPartyName,
  renderMeta,
  renderChipMeta,
  showSelectAll = true,
}) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedItems = useMemo(
    () => items.filter((item) => value.includes(getKey(item))),
    [items, value, getKey],
  );

  const filtered = useMemo(() => {
    const search = (inputValue || "").trim().toLowerCase();
    if (!search) return items;
    return items.filter((item) =>
      getLabel(item).toLowerCase().includes(search),
    );
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

  const handleToggle = useCallback(
    (key) =>
      onSelect(
        value.includes(key) ? value.filter((v) => v !== key) : [...value, key],
      ),
    [value, onSelect],
  );

  const handleRemove = useCallback(
    (key, e) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect(value.filter((v) => v !== key));
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
    const targetList = inputValue.trim() ? filtered : items;
    onSelect(targetList.map(getKey));
    setIsOpen(false);
  }, [inputValue, filtered, items, onSelect, getKey]);

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
          <div className="flex items-center gap-2 flex-wrap">
            {selectedItems.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1 flex-1">
                {selectedItems.map((item) => (
                  <div
                    key={getKey(item)}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs"
                  >
                    <span>{getLabel(item)}</span>
                    {renderChipMeta?.(item)}
                    <button
                      type="button"
                      onClick={(e) => handleRemove(getKey(item), e)}
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
                  {emptyText}
                </div>
              ) : (
                <div className="py-1">
                  {showSelectAll && (
                    <div className="px-3 py-2 border-b flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {value.length} از {items.length} انتخاب شده
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
                  )}

                  {filtered.map((item) => {
                    const key = getKey(item);
                    const isSelected = value.includes(key);

                    return (
                      <button
                        key={key}
                        type="button"
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${
                          isSelected ? "bg-accent/50" : ""
                        }`}
                        onClick={() => handleToggle(key)}
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
