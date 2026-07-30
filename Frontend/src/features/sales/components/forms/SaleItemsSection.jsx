// src/features/purchases/components/PurchaseItemsSection.jsx
import { useState, useMemo } from "react";
import { Plus, Trash2, Search, PackagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ROUTES } from "@/shared/constants/routes";

export default function SaleItemsSection({
  items,
  onItemsChange,
  products = [],
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
    return cats.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term);
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, search, categoryFilter]);

  const handleAddProduct = (product) => {
    const already = items.find((i) => i.productId === product.id);
    if (already) return;
    onItemsChange([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        unit: product.unit,
        qty: 1,
        unitPrice: product.purchasePrice ?? 0,
        discount: 0,
      },
    ]);
  };

  const handleRemoveItem = (productId) => {
    onItemsChange(items.filter((i) => i.productId !== productId));
  };

  const handleFieldChange = (productId, field, value) => {
    onItemsChange(
      items.map((i) =>
        i.productId === productId
          ? { ...i, [field]: Number(value) >= 0 ? Number(value) : 0 }
          : i,
      ),
    );
  };

  const lineTotal = (item) =>
    item.qty * item.unitPrice * (1 - (item.discount || 0) / 100);

  const grandTotal = items.reduce((sum, i) => sum + lineTotal(i), 0);

  const isAdded = (productId) => items.some((i) => i.productId === productId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اقلام فروش
        </CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            navigate(ROUTES.WAREHOUSE_PRODUCTS_NEW, {
              state: { returnTo: ROUTES.PURCHASES_NEW },
            })
          }
          className="gap-1.5 text-xs"
        >
          <PackagePlus className="w-3.5 h-3.5" />
          افزودن کالای جدید
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* پنل جست‌وجو و فیلتر */}
        <div className="space-y-3">
          {/* سطر جست‌وجو + فیلتر دسته‌بندی */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="جست‌وجو بر اساس نام، کد یا برند..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-8 text-sm h-9 input-rtl-placeholder"
              />
            </div>
            <Select
              value={categoryFilter || "all"}
              onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-full sm:w-40 rounded-md border border-input bg-card text-card-foreground text-sm focus:ring-2 focus:ring-ring transition-colors">
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
          </div>

          {/* لیست محصولات */}
          <div className="max-h-64 overflow-y-auto custom-scroll border border-border rounded-lg p-2 space-y-1 bg-muted/30">
            {filteredProducts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                کالایی یافت نشد
              </p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 rounded-md border border-border bg-card px-3 py-2 hover:bg-accent/50 transition-colors"
                >
                  {/* تصویر */}
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-10 h-10 rounded-md object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center shrink-0">
                      <span className="text-xs text-muted-foreground">
                        تصویر
                      </span>
                    </div>
                  )}

                  {/* اطلاعات */}
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <p className="text-sm font-medium text-card-foreground truncate">
                      {product.name}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {product.brand && (
                        <span className="text-xs text-muted-foreground">
                          برند: {product.brand}
                        </span>
                      )}
                      {product.category && (
                        <span className="text-xs text-muted-foreground">
                          دسته: {product.category}
                        </span>
                      )}
                      <span
                        className={`text-xs font-medium ${
                          product.stock === 0
                            ? "text-destructive"
                            : product.stock <= (product.lowStockThreshold ?? 10)
                              ? "text-[oklch(0.65_0.18_80)]"
                              : "text-[oklch(0.50_0.16_152)]"
                        }`}
                      >
                        موجودی: {product.stock} {product.unit}
                      </span>
                    </div>
                  </div>

                  {/* دکمه افزودن */}
                  <Button
                    type="button"
                    size="sm"
                    variant={isAdded(product.id) ? "secondary" : "default"}
                    disabled={isAdded(product.id)}
                    onClick={() => handleAddProduct(product)}
                    className="shrink-0 text-xs h-7 px-2 min-w-[3rem] w-full sm:w-auto"
                  >
                    {isAdded(product.id) ? (
                      "افزوده شد"
                    ) : (
                      <>
                        <span className="sm:hidden">افزودن</span>
                        <Plus className="w-3.5 h-3.5 hidden sm:block" />
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* آیتم‌های انتخاب‌شده */}
        {items.length > 0 && (
          <>
            {/* نسخه دسکتاپ: جدول */}
            <div className="hidden md:block border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-xs">
                  <tr>
                    <th className="text-right px-3 py-2.5 font-medium">کالا</th>
                    <th className="text-center px-2 py-2.5 font-medium w-20">
                      تعداد
                    </th>
                    <th className="text-center px-2 py-2.5 font-medium w-28">
                      قیمت واحد
                    </th>
                    <th className="text-center px-2 py-2.5 font-medium w-20">
                      تخفیف %
                    </th>
                    <th className="text-center px-2 py-2.5 font-medium w-28">
                      جمع
                    </th>
                    <th className="w-8 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr
                      key={item.productId}
                      className="hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-3 py-2">
                        <p className="font-medium text-card-foreground text-sm">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.productCode}
                        </p>
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            handleFieldChange(
                              item.productId,
                              "qty",
                              e.target.value,
                            )
                          }
                          className="h-7 text-center text-xs w-full"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleFieldChange(
                              item.productId,
                              "unitPrice",
                              e.target.value,
                            )
                          }
                          className="h-7 text-center text-xs w-full"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={item.discount}
                          onChange={(e) =>
                            handleFieldChange(
                              item.productId,
                              "discount",
                              e.target.value,
                            )
                          }
                          className="h-7 text-center text-xs w-full"
                        />
                      </td>
                      <td className="px-2 py-2 text-center text-xs font-medium text-card-foreground">
                        {lineTotal(item).toLocaleString("fa-IR")}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded"
                          aria-label="حذف کالا"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted border-t border-border">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-2.5 text-sm font-medium text-muted-foreground text-right"
                    >
                      جمع کل اقلام:
                    </td>
                    <td className="px-2 py-2.5 text-center text-sm font-bold text-card-foreground">
                      {grandTotal.toLocaleString("fa-IR")}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* نسخه موبایل: کارت */}
            <div className="md:hidden space-y-2">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="border border-border rounded-lg p-3 bg-card space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-card-foreground text-sm truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.productCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.productId)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded shrink-0"
                      aria-label="حذف کالا"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        تعداد
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) =>
                          handleFieldChange(
                            item.productId,
                            "qty",
                            e.target.value,
                          )
                        }
                        className="h-8 text-center text-xs w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        قیمت واحد
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleFieldChange(
                            item.productId,
                            "unitPrice",
                            e.target.value,
                          )
                        }
                        className="h-8 text-center text-xs w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        تخفیف %
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discount}
                        onChange={(e) =>
                          handleFieldChange(
                            item.productId,
                            "discount",
                            e.target.value,
                          )
                        }
                        className="h-8 text-center text-xs w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">جمع</span>
                    <span className="text-sm font-bold text-card-foreground">
                      {lineTotal(item).toLocaleString("fa-IR")}
                    </span>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 border border-border">
                <span className="text-sm font-medium text-muted-foreground">
                  جمع کل اقلام:
                </span>
                <span className="text-sm font-bold text-card-foreground">
                  {grandTotal.toLocaleString("fa-IR")}
                </span>
              </div>
            </div>
          </>
        )}

        {items.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-3 border border-dashed border-border rounded-lg">
            هنوز کالایی انتخاب نشده
          </p>
        )}
      </CardContent>
    </Card>
  );
}
