import { useId, useRef, useState } from "react";
import { List, Loader2, Plus, Search, X } from "lucide-react";
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
import {
  PRODUCT_SEARCH_LIMIT,
  useProductDetailLoader,
  useProductSearchLoader,
  useProductSearchQuery,
} from "@/features/warehouse/products/services/queries";
import { useProductCategoriesQuery } from "@/features/warehouse/categories/services/queries";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";
import { parseBarcode } from "@/shared/domain/barcode/productCode";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";


function stockTone(product) {
  if (product.stock === 0) return "danger";
  if (product.stock <= (product.lowStockThreshold ?? 10)) return "warning";
  return "success";
}

/**
 * جست‌وجو و افزودنِ کالا: یک فیلد برای نام/کد/برند و بارکدِ اسکنر، دکمه‌ی دوربین
 * کنارش، و زیرشان دسته‌بندی و «همه‌ی کالاها» — در هر عرضی دیده می‌شوند.
 *  - تایپ، از سرور جست‌وجو می‌کند (نزدیک‌ترین ۲۰۰ نتیجه به نام، کد، بارکد یا برند)؛ ↑/↓ بینِ نتیجه‌ها و Enter قلمِ برجسته را
 *    اضافه می‌کند — بی موس.
 *  - اسکنرِ دستی در هر دو فیلد کار می‌کند: کد را می‌نویسد و Enter می‌زند؛ اگر
 *    متن بارکدِ کالا (یا دانه) باشد، همان کالا اضافه می‌شود.
 *  - کالای بی‌تصویر جای خالی نمی‌گذارد؛ کادرش «تصویر» نوشته دارد.
 *
 * فهرست تا جست‌وجو، انتخابِ دسته یا «نمایش همه» بسته است. کاتالوگ در مرورگر
 * نگه داشته نمی‌شود؛ هر جست‌وجو به سرور می‌رود.
 *
 * `onAdd(product, reference?)` قلم را اضافه می‌کند؛ `false` یعنی رد شد (پیامش
 * را خودش داده). `addedQuantityOf(productId)` تعدادِ فعلیِ کالا در فهرست است
 * تا دکمه‌ی + نشان دهد الان چندتاست. `isPending(productId)` یعنی جزئیاتِ کالا
 * هنوز در راه است (دکمه چرخان می‌شود) و `onPrefetch(product)` جزئیات را پیش از
 * کلیک می‌گیرد تا اولین افزودن هم فوری باشد.
 */
export default function ProductSearchPanel({ addedQuantityOf, isPending, onPrefetch, onAdd }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [browseAll, setBrowseAll] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listId = useId();

  const { data: categories = [] } = useProductCategoriesQuery();
  const loadDetail = useProductDetailLoader();
  const loadSearch = useProductSearchLoader();

  const isListOpen = Boolean(search.trim() || categoryFilter || browseAll);
  const { products: shown, isSearching } = useProductSearchQuery(search, categoryFilter, {
    enabled: isListOpen,
  });
  const hiddenCount = shown.length >= PRODUCT_SEARCH_LIMIT ? 1 : 0;
  const activeIndex = Math.min(active, Math.max(shown.length - 1, 0));

  const add = (product, reference) => {
    const before = addedQuantityOf(product.id);
    if (onAdd(product, reference) === false) return false;
    if (reference?.kind === BarcodeReferenceKindEnum.UNIT) {
      toast.success(`یک دانه از «${product.name}» اسکن شد`);
    } else if (before > 0) {
      toast.success(`«${product.name}» شد ${formatNumber(before + 1)} عدد`, { id: `add-${product.id}` });
    } else {
      toast.success(`«${product.name}» اضافه شد`, { id: `add-${product.id}` });
    }
    return true;
  };

  /** متنِ کامل یک بارکد است؟ تطبیق روی payload، نه رشته‌ی خام. */
  const scan = (code) => {
    const reference = parseBarcode(code);
    if (reference.kind === BarcodeReferenceKindEnum.UNKNOWN) return false;
    loadDetail(reference.productId)
      .then((product) => add({ id: reference.productId, ...product }, reference))
      .catch(() => toast.error(`کالایی با کد «${code}» پیدا نشد`));
    return true;
  };

  const resetSearch = () => {
    setSearch("");
    setActive(0);
    inputRef.current?.focus();
  };

  const handleKeyDown = async (e) => {
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
      // نتیجه‌ی تأخیری ممکن است هنوز نرسیده باشد؛ همان جست‌وجو بی‌تأخیر (با کش).
      let results = shown;
      if (isSearching) {
        try {
          results = await loadSearch(term, categoryFilter);
        } catch {
          results = [];
        }
      }
      const product = results[Math.min(activeIndex, results.length - 1)];
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
    <div className="@container/search space-y-2">
      {/* یک فیلد برای جست‌وجو و اسکنرِ دستی (Enter)، دکمه‌ی دوربین کنارش؛ دسته‌بندی و
          «همه‌ی کالاها» ردیفِ بعد. */}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            role="combobox"
            aria-expanded={isListOpen}
            aria-controls={listId}
            aria-activedescendant={isListOpen && shown.length ? `${listId}-${activeIndex}` : undefined}
            placeholder="جست‌وجوی نام، کد، برند یا اسکنِ بارکد..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            className="input-rtl-placeholder pr-9 pl-8"
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
        <CameraScanButton
          className="shrink-0"
          onDetected={(code) => scan(code) || toast.error(`کد «${code}» شناخته نشد`)}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Select
          value={categoryFilter || "all"}
          onValueChange={(v) => {
            setCategoryFilter(v === "all" ? "" : v);
            setActive(0);
          }}
        >
          <SelectTrigger aria-label="دسته‌بندی" size="sm" className="min-w-0 flex-1 sm:w-44 sm:flex-none">
            <SelectValue placeholder="همه دسته‌ها" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه دسته‌ها</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {browseAll && !search.trim() && !categoryFilter ? (
          <Button type="button" size="sm" variant="ghost" className="shrink-0 whitespace-nowrap text-xs" onClick={() => setBrowseAll(false)}>
            بستن فهرست
          </Button>
        ) : (
          !isListOpen && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="shrink-0 gap-1.5 whitespace-nowrap text-xs"
              onClick={() => setBrowseAll(true)}
            >
              <List className="size-3.5" />
              همه‌ی کالاها
            </Button>
          )
        )}
      </div>

      {isListOpen && (
        <div className="overflow-hidden rounded-lg border border-border">
          <ul id={listId} role="listbox" className="custom-scroll max-h-72 divide-y divide-border overflow-y-auto bg-card">
            {shown.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                {isSearching ? "در حال جست‌وجو…" : "کالایی یافت نشد"}
              </li>
            )}
            {shown.map((product, index) => {
              const added = addedQuantityOf(product.id);
              const pending = isPending?.(product.id);
              return (
                <li
                  key={product.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => {
                    setActive(index);
                    onPrefetch?.(product);
                  }}
                  onPointerDown={() => onPrefetch?.(product)}
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
                    className="size-10 shrink-0 rounded-md border border-border object-cover"
                    fallback={
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                        <span className="text-[10px] text-muted-foreground">تصویر</span>
                      </div>
                    }
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
                    {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    {added > 0 && <span className="tabular-nums">{formatNumber(added)}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {hiddenCount > 0 && (
            <p className="border-t border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
              فقط {formatNumber(PRODUCT_SEARCH_LIMIT)} نتیجه‌ی اول نشان داده شد — دقیق‌تر جست‌وجو کنید.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
