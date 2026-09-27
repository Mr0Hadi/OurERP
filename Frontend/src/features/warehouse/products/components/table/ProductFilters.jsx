import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import BarcodeScanField from "@/shared/components/barcode/BarcodeScanField";
import { useProductFilterStore } from "../../store/productFilterStore";
import { fetchProductByBarcode } from "../../services/queries";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { useProductCategoriesQuery } from "@/features/warehouse/categories/services/queries";

// ─── ثابت‌ها (خارج از کامپوننت تا در هر رندر بازسازی نشوند) ─────────────────

const BRANDS = [
  "بوش",
  "مان",
  "ساکس",
  "لنکر",
  "تویس",
  "ماله",
  "فیلیپس",
  "سپاهان باتری",
  "مونرو",
  "لوک",
  "ویدا",
  "دنسو",
  "الرینگ",
  "قطعه گستر",
  "میتسوبیشی",
  "برمبو",
  "هالا",
];

// سرور فقط `isLowOnStock` دارد: «کم‌موجود» یعنی موجودی ≤ آستانه‌ی هشدار (ناموجودها هم جزوش‌اند).
const STOCK_OPTIONS = [
  { value: "true", label: "کم‌موجود یا ناموجود" },
  { value: "false", label: "موجودی کافی" },
];

const COMPLETENESS_OPTIONS = [{ value: "true", label: "فقط کالاهای ناقص" }];

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
const FilterSelect = ({
  label,
  value,
  onChange,
  allLabel = "همه",
  options,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
    <Label className="whitespace-nowrap font-medium text-foreground">
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
 * یک ردیف Label + PriceInput برای فیلتر قیمت.
 *
 * @param {string}   label     - متن برچسب
 * @param {number|null} value  - مقدار جاری
 * @param {Function} onChange  - callback: (next: number|null) => void
 * @param {string}   placeholder
 */
const PriceRangeInput = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:col-span-2">
    <Label className="whitespace-nowrap font-medium text-foreground">
      {label}
    </Label>
    <PriceInput
      placeholder={placeholder}
      value={value}
      onValueChange={onChange}
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
  const navigate = useNavigate();
  const categoriesQuery = useProductCategoriesQuery();
  const categoryOptions = (categoriesQuery.data ?? []).map((category) => ({
    value: category.id,
    label: category.name,
  }));
  const [isScanning, setIsScanning] = useState(false);
  const {
    name,
    brand,
    productCategoryId,
    fromPrice,
    toPrice,
    isLowOnStock,
    isIncomplete,
    setName,
    setBrand,
    setProductCategoryId,
    setPriceRange,
    setIsLowOnStock,
    setIsIncomplete,
    resetFilters,
  } = useProductFilterStore();

  // جلوگیری از ساخت closure جدید در هر رندر هنگام تغییر قیمت
  const handleMinPrice = useCallback(
    (next) => setPriceRange(next ?? "", toPrice),
    [toPrice, setPriceRange]
  );
  const handleMaxPrice = useCallback(
    (next) => setPriceRange(fromPrice, next ?? ""),
    [fromPrice, setPriceRange]
  );

  // اسکن یک کالا را دقیقاً شناسایی می‌کند، پس به‌جای فیلترکردن لیست،
  // مستقیم کاربر را به جزئیات همان کالا می‌برد — همان «انتخاب».
  const handleScan = async (code) => {
    setIsScanning(true);
    try {
      const product = await fetchProductByBarcode(code);
      if (!product) {
        toast.error(`کالایی با کد «${code}» پیدا نشد`);
        return;
      }
      navigate(routeWithId(ROUTES.WAREHOUSE_PRODUCTS_DETAIL, product.id));
    } catch {
      toast.error("خطا در جست‌وجوی بارکد");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">
      <BarcodeScanField
        onScan={handleScan}
        placeholder={
          isScanning ? "در حال جست‌وجو..." : "اسکن بارکد برای رفتن به کالا..."
        }
      />

      {/* ردیف اول: جستجو، برند، دسته‌بندی، وضعیت موجودی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* جستجوی متنی */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Label className="whitespace-nowrap font-medium text-foreground">
            جستجو
          </Label>
          <Input
            placeholder="نام فارسی یا انگلیسی کالا..."
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          value={productCategoryId}
          onChange={setProductCategoryId}
          allLabel="همه دسته‌ها"
          options={categoryOptions}
          numeric
        />

        <FilterSelect
          label="وضعیت موجودی"
          value={isLowOnStock}
          onChange={setIsLowOnStock}
          allLabel="همه"
          options={STOCK_OPTIONS}
        />
      </div>

      {/* ردیف دوم: محدوده قیمت + دکمه ریست */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-6 gap-5 pt-3 border-t border-border">
        <FilterSelect
          label="اطلاعات کالا"
          value={isIncomplete}
          onChange={setIsIncomplete}
          allLabel="همه"
          options={COMPLETENESS_OPTIONS}
        />

        <PriceRangeInput
          label="حداقل قیمت (ریال)"
          value={fromPrice === "" ? null : Number(fromPrice)}
          onChange={handleMinPrice}
          placeholder="از"
        />

        <PriceRangeInput
          label="حداکثر قیمت (ریال)"
          value={toPrice === "" ? null : Number(toPrice)}
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
