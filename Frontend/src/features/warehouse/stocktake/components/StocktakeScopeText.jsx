import { useProductCategoriesQuery } from "@/features/warehouse/categories/services/queries";
import { scopeSummary } from "../domain/stocktake";

/** دامنه‌ی انبارگردانی با نامِ دسته (فهرستِ دسته‌ها کوچک و در کش است). */
export default function StocktakeScopeText({ stocktake, className }) {
  const { data: categories } = useProductCategoriesQuery();
  const category = categories?.find((item) => item.id === stocktake.productCategoryId);
  return <span className={className}>{scopeSummary(stocktake, category?.name)}</span>;
}
