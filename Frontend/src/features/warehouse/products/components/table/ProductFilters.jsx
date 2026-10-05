import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";
import BarcodeScanField from "@/shared/components/barcode/BarcodeScanField";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import { useProductFilterStore } from "../../store/productFilterStore";
// اسکن یک کارِ لحظه‌ای است، نه داده‌ای که در کش بماند؛ پس خودِ تابعِ API.
import { fetchProductByBarcode } from "../../services/api-v1";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { useProductCategoriesQuery } from "@/features/warehouse/categories/services/queries";
import { getErrorMessage } from "@/shared/lib/errorMessage";

// سرور فقط `isLowOnStock` دارد: «کم‌موجود» یعنی موجودی ≤ آستانه‌ی هشدار (ناموجودها هم جزوش‌اند).
const STOCK_OPTIONS = [
  { value: "true", label: "کم‌موجود یا ناموجود" },
  { value: "false", label: "موجودی کافی" },
];

const COMPLETENESS_OPTIONS = [{ value: "true", label: "فقط کالاهای ناقص" }];

function PriceRangeInput({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:col-span-2">
      <Label className="whitespace-nowrap font-medium text-foreground">{label}</Label>
      <PriceInput
        placeholder={placeholder}
        value={value === "" ? null : Number(value)}
        onValueChange={onChange}
        className="flex-1"
      />
    </div>
  );
}

/**
 * فیلترهای لیستِ کالا (همه در `useProductFilterStore`، با نامِ پارامترهای
 * `GetProductList`): اسکنِ بارکد، نام، برند، دسته‌بندی، موجودی، کامل‌بودن و
 * بازه‌ی قیمت.
 *
 * برند متنِ آزاد است (سرور «شامل» جست‌وجو می‌کند). پیش‌تر یک فهرستِ ثابتِ ۱۷
 * برندی در کد بود و کالای هر برندِ دیگری (مثلاً «ایساکو»، که مثالِ خودِ فرمِ
 * کالاست) با این فیلتر پیدا نمی‌شد.
 */
export default function ProductFilters() {
  const navigate = useNavigate();
  const { data: categories = [] } = useProductCategoriesQuery();
  const categoryOptions = categories.map((category) => ({
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
    } catch (error) {
      toast.error(getErrorMessage(error, "جست‌وجوی بارکد انجام نشد"));
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">
      <BarcodeScanField
        onScan={handleScan}
        placeholder={isScanning ? "در حال جست‌وجو..." : "اسکن بارکد برای رفتن به کالا..."}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <FilterSearchInput
          placeholder="نام فارسی یا انگلیسی کالا..."
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <FilterSearchInput
          label="برند"
          placeholder="مثلاً بوش"
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
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
          options={STOCK_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-6 gap-5 pt-3 border-t border-border">
        <FilterSelect
          label="اطلاعات کالا"
          value={isIncomplete}
          onChange={setIsIncomplete}
          options={COMPLETENESS_OPTIONS}
        />
        <PriceRangeInput
          label="حداقل قیمت (ریال)"
          value={fromPrice}
          onChange={(next) => setPriceRange(next ?? "", toPrice)}
          placeholder="از"
        />
        <PriceRangeInput
          label="حداکثر قیمت (ریال)"
          value={toPrice}
          onChange={(next) => setPriceRange(fromPrice, next ?? "")}
          placeholder="تا"
        />
        <div className="flex items-end xs:col-span-2 lg:col-span-1 lg:justify-end">
          <Button type="button" variant="outline" onClick={resetFilters} className="w-full px-4">
            حذف همه فیلترها
          </Button>
        </div>
      </div>
    </div>
  );
}
