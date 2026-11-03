import { useState } from "react";

import EntitySelect from "@/shared/components/filters/EntitySelect";
import { useProductQuery, useProductSearchQuery } from "../services/queries";

const productName = (product) => product.name ?? "";
const renderCode = (product) =>
  product.code ? (
    <span className="text-xs text-muted-foreground" dir="ltr">
      {product.code}
    </span>
  ) : null;

/**
 * انتخابِ یک کالا با جست‌وجوی سرور (نام، کد، بارکد، برند — `useProductSearchQuery`)، برای فیلترِ
 * فهرست‌ها. تا فهرست بسته است چیزی گرفته نمی‌شود؛ نامِ کالای انتخاب‌شده (مثلاً از `?productId=`)
 * از جزئیاتِ کالا می‌آید.
 *
 * @param {number|""} value
 * @param {(id: number|"", product) => void} onSelect `""` یعنی پاک‌کردن
 */
export default function ProductSelect({ value, onSelect, label = "کالا", placeholder = "همه‌ی کالاها" }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { products, isSearching } = useProductSearchQuery(search, "", { enabled: open });
  const selectedQuery = useProductQuery(value === "" || value == null ? null : value);

  return (
    <EntitySelect
      label={label}
      placeholder={placeholder}
      emptyText="کالایی یافت نشد"
      items={products}
      selected={selectedQuery.data}
      value={value ?? ""}
      onSelect={onSelect}
      onSearchChange={setSearch}
      onOpenChange={setOpen}
      isLoading={isSearching && products.length === 0}
      getLabel={productName}
      renderMeta={renderCode}
    />
  );
}
