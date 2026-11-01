import { formatNumber } from "@/shared/lib/numberFormat";
import { useBrandOptionsQuery } from "../services/queries";

/**
 * پیشنهادهای برند برای یک فیلدِ متنی (`<input list={id}>`) از برندهای موجود (`GetBrandList`). برند همچنان متنِ
 * آزاد است — برندِ تازه نوشته می‌شود — ولی املای یکسانِ برندهای موجود دمِ دست است.
 *
 * @param id    همان `list`ِ فیلد
 * @param value متنِ فعلیِ فیلد، برای جست‌وجوی سرور
 */
export default function BrandSuggestions({ id, value }) {
  const brands = useBrandOptionsQuery(value);
  return (
    <datalist id={id}>
      {brands.map((item) => (
        <option key={item.brand} value={item.brand} label={`${formatNumber(item.productCount)} کالا`} />
      ))}
    </datalist>
  );
}
