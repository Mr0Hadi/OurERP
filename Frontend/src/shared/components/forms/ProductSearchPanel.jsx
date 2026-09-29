import { useState, useMemo } from "react";
import { List, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";
import RemoteImage from "@/shared/components/files/RemoteImage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import BarcodeScanField from "@/shared/components/barcode/BarcodeScanField";
import { parseBarcode } from "@/shared/domain/barcode/productCode";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * جست‌وجو و انتخاب کالا برای افزودن به اقلام.
 * قیمت اولیه‌ی هر قلم را خودِ فراخوان در onAdd تعیین می‌کند،
 * چون در خرید و فروش از دو فیلد قیمت متفاوت خوانده می‌شود.
 *
 * اسکن بارکد همان مسیرِ افزودنِ دستی را طی می‌کند: کالای منطبق پیدا و
 * مستقیم به onAdd داده می‌شود — بدون نیاز به کلیک روی دکمه‌ی افزودن.
 *
 * `addedQuantityOf(productId)` تعدادِ فعلیِ همان کالا در لیست است (صفر
 * یعنی هنوز اضافه نشده). عمداً «تعداد» است نه بولین: دکمه‌ی افزودن بعد
 * از اولین کلیک هم فعال می‌ماند تا بشود تعداد را از روی همین لیست
 * زیاد کرد، و باید نشان دهد الان چندتاست.
 *
 * فهرست تا وقتی کاربر چیزی جست‌وجو نکرده (یا دسته/«نمایش همه» را نزده)
 * بسته است و بیش از `MAX_RESULTS` ردیف نشان نمی‌دهد: قبلاً کلِ کاتالوگ
 * بالای فاکتور رندر می‌شد و روی موبایل طرف‌حساب و دکمه‌ی ذخیره زیرش گم
 * بودند.
 */
const MAX_RESULTS = 30;

export default function ProductSearchPanel({ products, addedQuantityOf, onAdd }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [browseAll, setBrowseAll] = useState(false);

  const handleScan = (code) => {
    // تطبیق روی payload، نه رشته‌ی خام: اسکنر ممکن است کدِ خوانا بدهد یا
    // فقط رقم‌ها، و بارکدِ یک دانه هم باید به کالای خودش برسد.
    const reference = parseBarcode(code);
    const product =
      reference.kind === BarcodeReferenceKindEnum.UNKNOWN
        ? null
        : products.find((p) => Number(p.id) === reference.productId);
    if (!product) {
      toast.error(`کالایی با کد «${code}» پیدا نشد`);
      return;
    }
    const previousQuantity = addedQuantityOf(product.id);
    // مرجعِ بارکد هم داده می‌شود تا فراخوان اگر بخواهد کدِ دانه را نگه دارد؛
    // `false` یعنی افزودن رد شد (مثلاً دانه‌ی تکراری) و پیامش را خودش داده.
    if (onAdd(product, reference) === false) return;
    if (reference.kind === BarcodeReferenceKindEnum.UNIT) {
      toast.success(`یک دانه از «${product.name}» اسکن شد`);
      return;
    }
    toast.success(
      previousQuantity > 0
        ? `«${product.name}» شد ${(previousQuantity + 1).toLocaleString("fa-IR")} عدد`
        : `«${product.name}» اضافه شد`,
    );
  };

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.categoryName).filter(Boolean))];
    return cats.sort();
  }, [products]);

  const isListOpen = Boolean(search.trim() || categoryFilter || browseAll);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term);
      const matchCategory = !categoryFilter || p.categoryName === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, search, categoryFilter]);
  const shownProducts = filteredProducts.slice(0, MAX_RESULTS);
  const hiddenCount = filteredProducts.length - shownProducts.length;

  return (
    <div className="space-y-3">
      <BarcodeScanField onScan={handleScan} />

      {/* سطر جست‌وجو + فیلتر دسته‌بندی */}
      <div className="flex gap-2">
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
          <SelectTrigger
            aria-label="دسته‌بندی"
            className="h-9 w-28 sm:w-40 shrink-0 rounded-md border border-input bg-card text-card-foreground text-sm focus:ring-2 focus:ring-ring transition-colors"
          >
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

      {!isListOpen ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">
            نام، کد یا برند را جست‌وجو یا بارکد را اسکن کنید.
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setBrowseAll(true)}
          >
            <List className="h-3.5 w-3.5" />
            نمایش همه ({formatNumber(products.length)})
          </Button>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto custom-scroll border border-border rounded-lg p-1.5 space-y-1 bg-muted/30">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              کالایی یافت نشد
            </p>
          ) : (
            shownProducts.map((product) => {
              const addedQuantity = addedQuantityOf(product.id);
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-1.5 hover:bg-accent/50 transition-colors"
                >
                  {/* تصویر — اگر پاسخ فقط کلید داشته باشد، آدرس خودش گرفته می‌شود */}
                  <RemoteImage
                    imageKey={product.imageKey}
                    imageUrl={product.imageUrl ?? product.image}
                    alt={product.name}
                    className="hidden min-[420px]:block w-9 h-9 rounded-md object-cover shrink-0 border border-border"
                    fallback={
                      <div className="hidden min-[420px]:block w-9 h-9 rounded-md bg-muted border border-border shrink-0" />
                    }
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">
                      {product.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[product.code, product.brand].filter(Boolean).join(" · ")}
                      {" · "}
                      <span
                        className={
                          product.stock === 0
                            ? "text-destructive"
                            : product.stock <= (product.lowStockThreshold ?? 10)
                              ? "text-warning"
                              : "text-success"
                        }
                      >
                        موجودی {formatNumber(product.stock)} {unitLabelOf(product.unit)}
                      </span>
                    </p>
                  </div>

                  {/* دکمه افزودن — بعد از افزوده‌شدن هم فعال می‌ماند تا با هر
                      کلیک یکی به تعداد اضافه شود؛ عدد روی دکمه، تعداد فعلی است. */}
                  <Button
                    type="button"
                    size="sm"
                    variant={addedQuantity > 0 ? "secondary" : "default"}
                    onClick={() => onAdd(product)}
                    aria-label={
                      addedQuantity > 0
                        ? `یکی دیگر از ${product.name} (اکنون ${addedQuantity.toLocaleString("fa-IR")} عدد)`
                        : `افزودنِ ${product.name}`
                    }
                    className="shrink-0 text-xs h-7 px-2 min-w-10 gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {addedQuantity > 0 && (
                      <span className="tabular-nums">
                        {addedQuantity.toLocaleString("fa-IR")}
                      </span>
                    )}
                  </Button>
                </div>
              );
            })
          )}
          {hiddenCount > 0 && (
            <p className="text-center text-[11px] text-muted-foreground py-1.5">
              {formatNumber(hiddenCount)} کالای دیگر — جست‌وجو را دقیق‌تر کنید.
            </p>
          )}
        </div>
      )}
      {browseAll && !search.trim() && !categoryFilter && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full h-7 text-xs"
          onClick={() => setBrowseAll(false)}
        >
          بستن فهرست کالاها
        </Button>
      )}
    </div>
  );
}
