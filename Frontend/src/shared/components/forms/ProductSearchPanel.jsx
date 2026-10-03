import { useId, useMemo, useRef, useState } from "react";
import { List, Plus, Search, X } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import RemoteImage from "@/shared/components/files/RemoteImage";
import CameraScanButton from "@/shared/components/barcode/CameraScanButton";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";
import { parseBarcode } from "@/shared/domain/barcode/productCode";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

const MAX_RESULTS = 30;

function stockTone(product) {
  if (product.stock === 0) return "danger";
  if (product.stock <= (product.lowStockThreshold ?? 10)) return "warning";
  return "success";
}

/**
 * جست‌وجو و افزودنِ کالا — یک فیلد برای نام، کد، برند *و* بارکد.
 *
 * قبلاً سه ورودیِ جدا بود (اسکن، جست‌وجو، دسته). حالا:
 *  - تایپ، فهرست را فیلتر می‌کند؛ ↑/↓ بینِ نتیجه‌ها و Enter قلمِ برجسته را
 *    اضافه می‌کند — بی موس.
 *  - اسکنرِ دستی مثلِ صفحه‌کلید کد را می‌نویسد و Enter می‌زند: اگر متن بارکدِ
 *    کالا (یا دانه) باشد، همان کالا اضافه می‌شود.
 *  - دکمه‌ی دوربین برای دستگاه‌های بی‌اسکنر.
 *
 * فهرست تا جست‌وجو یا «نمایش همه» بسته است و بیش از `MAX_RESULTS` ردیف
 * نشان نمی‌دهد.
 *
 * `onAdd(product, reference?)` قلم را اضافه می‌کند؛ `false` یعنی رد شد (پیامش
 * را خودش داده). `addedQuantityOf(productId)` تعدادِ فعلیِ کالا در فهرست است
 * تا دکمه‌ی + نشان دهد الان چندتاست.
 */
export default function ProductSearchPanel({ products, addedQuantityOf, onAdd }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [browseAll, setBrowseAll] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listId = useId();

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.categoryName).filter(Boolean))].sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term);
      return matchSearch && (!categoryFilter || p.categoryName === categoryFilter);
    });
  }, [products, search, categoryFilter]);

  const isListOpen = Boolean(search.trim() || categoryFilter || browseAll);
  const shown = filtered.slice(0, MAX_RESULTS);
  const hiddenCount = filtered.length - shown.length;
  const activeIndex = Math.min(active, Math.max(shown.length - 1, 0));

  const add = (product, reference) => {
    const before = addedQuantityOf(product.id);
    if (onAdd(product, reference) === false) return false;
    if (reference?.kind === BarcodeReferenceKindEnum.UNIT) {
      toast.success(`یک دانه از «${product.name}» اسکن شد`);
    } else if (before > 0) {
      toast.success(`«${product.name}» شد ${formatNumber(before + 1)} عدد`);
    }
    return true;
  };

  /** متنِ کامل یک بارکد است؟ تطبیق روی payload، نه رشته‌ی خام. */
  const scan = (code) => {
    const reference = parseBarcode(code);
    if (reference.kind === BarcodeReferenceKindEnum.UNKNOWN) return false;
    const product = products.find((p) => Number(p.id) === reference.productId);
    if (!product) {
      toast.error(`کالایی با کد «${code}» پیدا نشد`);
      return true;
    }
    if (add(product, reference) && addedQuantityOf(product.id) === 0) {
      toast.success(`«${product.name}» اضافه شد`);
    }
    return true;
  };

  const resetSearch = () => {
    setSearch("");
    setActive(0);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!shown.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = (activeIndex + step + shown.length) % shown.length;
      setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      // Enter نباید فرمِ کل صفحه را بفرستد.
      e.preventDefault();
      const term = search.trim();
      if (!term) return;
      if (scan(term)) return resetSearch();
      const product = shown[activeIndex];
      if (product) {
        add(product);
        resetSearch();
      } else {
        toast.error(`کالایی با «${term}» پیدا نشد`);
      }
    } else if (e.key === "Escape" && search) {
      e.preventDefault();
      resetSearch();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            role="combobox"
            aria-expanded={isListOpen}
            aria-controls={listId}
            aria-activedescendant={isListOpen && shown.length ? `${listId}-${activeIndex}` : undefined}
            placeholder="نام، کد یا بارکدِ کالا..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            className="input-rtl-placeholder h-10 pr-9 pl-8"
          />
          {search && (
            <button
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={resetSearch}
              aria-label="پاک‌کردنِ جست‌وجو"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {categories.length > 0 && (
          <Select
            value={categoryFilter || "all"}
            onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger aria-label="دسته‌بندی" className="hidden h-10! w-36 shrink-0 sm:flex">
              <SelectValue placeholder="همه دسته‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دسته‌ها</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <CameraScanButton className="size-10 shrink-0" onDetected={(code) => scan(code) || toast.error(`کد «${code}» شناخته نشد`)} />
      </div>

      {!isListOpen ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs text-muted-foreground">
            جست‌وجو کنید یا بارکد را اسکن کنید؛ Enter اولین نتیجه را اضافه می‌کند.
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs"
            onClick={() => setBrowseAll(true)}
          >
            <List className="size-3.5" />
            همه‌ی کالاها ({formatNumber(products.length)})
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <ul id={listId} role="listbox" className="custom-scroll max-h-72 divide-y divide-border overflow-y-auto bg-card">
            {shown.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">کالایی یافت نشد</li>
            )}
            {shown.map((product, index) => {
              const added = addedQuantityOf(product.id);
              return (
                <li
                  key={product.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => add(product)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors",
                    index === activeIndex && "bg-accent",
                  )}
                >
                  <RemoteImage
                    imageKey={product.imageKey}
                    imageUrl={product.imageUrl ?? product.image}
                    alt=""
                    className="hidden size-9 shrink-0 rounded-md border border-border object-cover min-[420px]:block"
                    fallback={<div className="hidden size-9 shrink-0 rounded-md bg-muted min-[420px]:block" />}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {[product.code, product.brand].filter(Boolean).join(" · ")}
                      {" · "}
                      <span className={toneText(stockTone(product))}>
                        موجودی {formatNumber(product.stock)} {unitLabelOf(product.unit)}
                      </span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex h-7 min-w-9 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium",
                      added > 0 ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground",
                    )}
                    aria-label={added > 0 ? `یکی دیگر (اکنون ${formatNumber(added)})` : "افزودن"}
                  >
                    <Plus className="size-3.5" />
                    {added > 0 && <span className="tabular-nums">{formatNumber(added)}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {(hiddenCount > 0 || (browseAll && !search.trim() && !categoryFilter)) && (
            <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
              <span>{hiddenCount > 0 && `${formatNumber(hiddenCount)} کالای دیگر — دقیق‌تر جست‌وجو کنید.`}</span>
              {browseAll && !search.trim() && !categoryFilter && (
                <button type="button" className="font-medium hover:text-foreground" onClick={() => setBrowseAll(false)}>
                  بستن فهرست
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
