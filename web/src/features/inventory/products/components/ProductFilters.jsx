// features/inventory/components/ProductFilters.jsx

import { useCallback } from "react";
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
import useProductFilterStore from "../store/productFilterStore";

// ─── ثابت‌ها (خارج از کامپوننت تا در هر رندر بازسازی نشوند) ─────────────────

const BRANDS = [
  "بوش", "مان", "ساکس", "لنکر", "تویس", "ماله", "فیلیپس",
  "سپاهان باتری", "مونرو", "لوک", "ویدا", "دنسو", "الرینگ",
  "قطعه گستر", "میتسوبیشی", "برمبو", "هالا",
];

const CATEGORIES = [
  "موتور", "سیستم ترمز", "سیستم تعلیق", "بدنه",
  "گیربکس", "سیستم خنک کننده", "برق و روشنایی", "برق و الکترونیک",
];

const STOCK_OPTIONS = [
  { value: "inStock",    label: "موجود (بیش از ۱۰)" },
  { value: "lowStock",   label: "کمتر از ۱۰" },
  { value: "outOfStock", label: "ناموجود" },
];

/** مقدار "all" را به رشته خالی تبدیل می‌کند تا استور با undefined/null کار نکند */
const normalize = (value) => (value === "all" ? "" : value);

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * یک ردیف Label + Select با پشتیبانی از گزینه «همه».
 *
 * @param {string}   label       - متن برچسب
 * @param {string}   value       - مقدار جاری (رشته خالی = همه)
 * @param {Function} onChange    - callback: (normalizedValue: string) => void
 * @param {string}   allLabel    - متن گزینه «همه» (پیش‌فرض: «همه»)
 * @param {object[]} options     - آرایه‌ای از { value, label } یا رشته
 */
const FilterSelect = ({ label, value, onChange, allLabel = "همه", options }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
    <Label className="whitespace-nowrap font-medium text-foreground">
      {label}
    </Label>
    <Select value={value || "all"} onValueChange={(v) => onChange(normalize(v))}>
      <SelectTrigger className="flex-1 w-full">
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((opt) => {
          const val = typeof opt === "string" ? opt : opt.value;
          const lbl = typeof opt === "string" ? opt : opt.label;
          return (
            <SelectItem key={val} value={val}>
              {lbl}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  </div>
);

/**
 * یک ردیف Label + Input عددی برای فیلتر قیمت.
 *
 * @param {string}   label     - متن برچسب
 * @param {string}   value     - مقدار جاری
 * @param {Function} onChange  - callback: (e: ChangeEvent) => void
 * @param {string}   placeholder
 */

const PriceInput = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:col-span-2">
    <Label className="whitespace-nowrap font-medium text-foreground">
      {label}
    </Label>
    <Input
      type="number"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="flex-1"
    />
  </div>
);

// ─── کامپوننت اصلی ────────────────────────────────────────────────────────────

/**
 * نوار فیلترهای محصولات انبار.
 * تمام state از طریق `useProductFilterStore` (Zustand) مدیریت می‌شود.
 *
 * فیلترها:
 * - جستجوی متنی (نام / برند / کد کالا)
 * - برند
 * - دسته‌بندی
 * - وضعیت موجودی
 * - محدوده قیمت (حداقل / حداکثر)
 */
const ProductFilters = () => {
  const {
    globalSearch,
    brand,
    category,
    minPrice,
    maxPrice,
    stockStatus,
    setGlobalSearch,
    setBrand,
    setCategory,
    setPriceRange,
    setStockStatus,
    resetFilters,
  } = useProductFilterStore();

  // جلوگیری از ساخت closure جدید در هر رندر هنگام تغییر قیمت
  const handleMinPrice = useCallback(
    (e) => setPriceRange(e.target.value, maxPrice),
    [maxPrice, setPriceRange]
  );
  const handleMaxPrice = useCallback(
    (e) => setPriceRange(minPrice, e.target.value),
    [minPrice, setPriceRange]
  );

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">

      {/* ردیف اول: جستجو، برند، دسته‌بندی، وضعیت موجودی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* جستجوی متنی */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Label className="whitespace-nowrap font-medium text-foreground">
            جستجو
          </Label>
          <Input
            placeholder="نام، برند یا کد کالا..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="flex-1"
          />
        </div>

        <FilterSelect
          label="برند"
          value={brand}
          onChange={setBrand}
          allLabel="همه برندها"
          options={BRANDS}
        />

        <FilterSelect
          label="دسته‌بندی"
          value={category}
          onChange={setCategory}
          allLabel="همه دسته‌ها"
          options={CATEGORIES}
        />

        <FilterSelect
          label="وضعیت موجودی"
          value={stockStatus}
          onChange={setStockStatus}
          allLabel="همه"
          options={STOCK_OPTIONS}
        />
      </div>

      {/* ردیف دوم: محدوده قیمت + دکمه ریست */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-5 pt-3 border-t border-border">

        <PriceInput
          label="حداقل قیمت (تومان)"
          value={minPrice}
          onChange={handleMinPrice}
          placeholder="از"
        />

        <PriceInput
          label="حداکثر قیمت (تومان)"
          value={maxPrice}
          onChange={handleMaxPrice}
          placeholder="تا"
        />

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

export default ProductFilters;
