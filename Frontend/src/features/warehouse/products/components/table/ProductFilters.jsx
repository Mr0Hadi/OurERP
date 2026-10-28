import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/shared/hooks/useIsMobile";

import { Button } from "@/shared/components/ui/button";
import { ResponsiveFilters } from "@/shared/components/filters/FilterPanel";
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import { useProductFilterStore } from "../../store/productFilterStore";
import { useScanProductMutation } from "../../services/mutations";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import ProductCodeSearchField from "./ProductCodeSearchField";
import { useVehiclesQuery } from "@/features/warehouse/vehicles/services/queries";
import CategorySelect from "@/features/warehouse/categories/components/CategorySelect";

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
 * `GetProductList`): کد/بارکد، نام، برند، دسته‌بندی، موجودی، کامل‌بودن و
 * بازه‌ی قیمت.
 *
 * برند متنِ آزاد است (سرور «شامل» جست‌وجو می‌کند). پیش‌تر یک فهرستِ ثابتِ ۱۷
 * برندی در کد بود و کالای هر برندِ دیگری (مثلاً «ایساکو»، که مثالِ خودِ فرمِ
 * کالاست) با این فیلتر پیدا نمی‌شد.
 */
export default function ProductFilters() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const scanProduct = useScanProductMutation();
  const { data: vehicleData, isLoading: isVehiclesLoading } = useVehiclesQuery();
  const {
    code,
    name,
    brand,
    productCategoryId,
    vehicleId,
    fromPrice,
    toPrice,
    isLowOnStock,
    isIncomplete,
    setCode,
    setName,
    setBrand,
    setProductCategoryId,
    setVehicleId,
    setPriceRange,
    setIsLowOnStock,
    setIsIncomplete,
    resetFilters,
  } = useProductFilterStore();

  // Enter، اسکنر یا دوربین: کدِ دقیق مستقیم به جزئیات می‌رود؛ وگرنه همان متن
  // فیلترِ لیست می‌ماند و کالاهای مشابه دیده می‌شوند.
  const handleScan = (scanned) =>
    scanProduct.mutate(scanned, {
      onSuccess: (product) => {
        if (!product) return setCode(scanned);
        setCode("");
        navigate(routeWithId(ROUTES.WAREHOUSE_PRODUCTS_DETAIL, product.id));
      },
    });

  const nameSearch = (
    <FilterSearchInput
      placeholder="نام فارسی یا انگلیسی کالا..."
      value={name}
      onChange={(event) => setName(event.target.value)}
    />
  );

  return (
    <ResponsiveFilters
      store={useProductFilterStore}
      onReset={resetFilters}
      secondary={isMobile ? nameSearch : null}
      primary={
        <ProductCodeSearchField
          value={code}
          onChange={setCode}
          onScan={handleScan}
          isBusy={scanProduct.isPending}
        />
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {!isMobile && nameSearch}
        <FilterSearchInput
          label="برند"
          placeholder="مثلاً بوش"
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
        />
        <CategorySelect value={productCategoryId} onSelect={setProductCategoryId} />
        <EntitySelect
          label="خودرو"
          placeholder="همه خودروها"
          emptyText="خودرویی یافت نشد"
          items={vehicleData?.items ?? []}
          getLabel={(vehicle) => vehicle.name}
          value={vehicleId}
          onSelect={setVehicleId}
          isLoading={isVehiclesLoading}
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
        {/* در موبایل ریست در پایینِ پنلِ بازشونده است. */}
        <div className="hidden md:flex items-end xs:col-span-2 lg:col-span-1 lg:justify-end">
          <Button type="button" variant="outline" onClick={resetFilters} className="w-full px-4">
            حذف همه فیلترها
          </Button>
        </div>
      </div>
    </ResponsiveFilters>
  );
}
