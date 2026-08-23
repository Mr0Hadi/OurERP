import { useState, useMemo } from "react";
import { Plus, Search } from "lucide-react";
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
import BarcodeScanField from "@/shared/components/barcode/BarcodeScanField";

/**
 * جست‌وجو و انتخاب کالا برای افزودن به اقلام.
 * قیمت اولیه‌ی هر قلم را خودِ فراخوان در onAdd تعیین می‌کند،
 * چون در خرید و فروش از دو فیلد قیمت متفاوت خوانده می‌شود.
 *
 * اسکن بارکد همان مسیرِ افزودنِ دستی را طی می‌کند: کالای منطبق پیدا و
 * مستقیم به onAdd داده می‌شود — بدون نیاز به کلیک روی دکمه‌ی افزودن.
 *
 * addedQtyOf(productId) تعدادِ فعلیِ همان کالا در لیست است (صفر یعنی
 * هنوز اضافه نشده). عمداً «تعداد» است نه یک بولین، چون دکمه‌ی افزودن
 * بعد از اولین کلیک هم فعال می‌ماند و باید نشان دهد الان چندتاست —
 * قبلاً غیرفعال می‌شد و راهی برای زیادکردن تعداد از روی همین لیست
 * نبود.
 */
export default function ProductSearchPanel({ products, addedQtyOf, onAdd }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const handleScan = (code) => {
    const product = products.find(
      (p) => p.barcode === code || p.code === code,
    );
    if (!product) {
      toast.error(`کالایی با کد «${code}» پیدا نشد`);
      return;
    }
    const previousQty = addedQtyOf(product.id);
    onAdd(product);
    toast.success(
      previousQty > 0
        ? `«${product.name}» شد ${(previousQty + 1).toLocaleString("fa-IR")} عدد`
        : `«${product.name}» اضافه شد`,
    );
  };

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
        p.brand?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term);
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, search, categoryFilter]);

  return (
    <div className="space-y-3">
      <BarcodeScanField onScan={handleScan} />

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
      <div className="lg:max-h-64 max-h-100 overflow-y-auto custom-scroll border border-border rounded-lg p-2 space-y-1 bg-muted/30">
        {filteredProducts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            کالایی یافت نشد
          </p>
        ) : (
          filteredProducts.map((product) => {
            const addedQty = addedQtyOf(product.id);
            return (
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

              {/* دکمه افزودن — بعد از افزوده‌شدن هم فعال می‌ماند تا با هر
                  کلیک یکی به تعداد اضافه شود؛ عدد روی دکمه، تعداد فعلی است. */}
              <Button
                type="button"
                size="sm"
                variant={addedQty > 0 ? "secondary" : "default"}
                onClick={() => onAdd(product)}
                title={
                  addedQty > 0
                    ? `یکی دیگر اضافه کن (اکنون ${addedQty.toLocaleString("fa-IR")} عدد)`
                    : "افزودن به اقلام"
                }
                className="shrink-0 text-xs h-7 px-2 min-w-[3rem] w-full sm:w-auto gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {addedQty > 0 ? (
                  <span className="tabular-nums">
                    {addedQty.toLocaleString("fa-IR")}
                  </span>
                ) : (
                  <span className="sm:hidden">افزودن</span>
                )}
              </Button>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
