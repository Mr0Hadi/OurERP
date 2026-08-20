import { useMemo, useState } from "react";
import { Link2, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import ProductSearchPanel from "@/shared/components/forms/ProductSearchPanel";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { useCreateProductMutation } from "@/features/warehouse/products/services/mutations";
import {
  generateProductCode,
  generateProductBarcode,
} from "@/features/warehouse/products/services/api-mockData";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

/**
 * وصل‌کردن یک «کالای ثبت‌نشده» به یک کالای واقعی، دقیقاً در لحظه‌ای که
 * لازم می‌شود: تصمیم به نگهداری.
 *
 * انباردار پای بارانداز نه قیمت خرید می‌داند نه دسته‌بندی، و اگر کالا
 * قرار بود عودت داده شود اصلاً به رکورد کالا نیازی نبود. اینجا هم
 * اطلاعات لازم هست و هم کسی که باید تصمیم بگیرد.
 *
 * دسته‌بندی‌ها از خودِ کالاهای موجود استخراج می‌شوند نه از یک فهرست
 * جداگانه — این‌طور همیشه با چیزی که واقعاً در فهرست کالاها هست
 * هم‌خوان می‌ماند (NOTES.md: دو فهرست دسته‌بندی ناهمخوان).
 */
export default function UnknownItemProductLinkDialog({
  open,
  onOpenChange,
  item,
  pendingResolution,
  onConfirm,
  isBusy,
}) {
  const [mode, setMode] = useState("pick");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newPurchasePrice, setNewPurchasePrice] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: productsData, isLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );
  const createProductMutation = useCreateProductMutation();

  const products = useMemo(() => productsData?.items ?? [], [productsData]);
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products],
  );

  // فرم «کالای جدید» با همان چیزی که انبار دیده پیش‌پر می‌شود؛ قیمت
  // پیش‌فرض هم مبلغی است که همین الان برای تسویه وارد شده، تقسیم بر
  // تعداد.
  const openCreateMode = () => {
    const amount = Number(pendingResolution?.refundAmount) || 0;
    const qty = Number(pendingResolution?.qty) || 1;
    setNewName(item.productName || "");
    setNewUnit(item.unit || "عدد");
    setNewPurchasePrice(amount > 0 ? String(Math.round(amount / qty)) : "");
    setNewCategory(categories[0] || "");
    setMode("create");
  };

  const handlePick = (product) => {
    onConfirm({
      linkedProductId: product.id,
      linkedProductCode: product.code,
      linkedProductName: product.name,
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const [{ code }, { barcode }] = await Promise.all([
        generateProductCode({ category: newCategory }),
        generateProductBarcode({ category: newCategory }),
      ]);
      // ساخت کالا در mockData گاهی عمداً شکست می‌خورد؛ خطایش را خودِ
      // mutation توست می‌کند و دیالوگ باز می‌ماند تا کاربر دوباره
      // تلاش کند — نه این‌که تصمیم نیمه‌کاره ثبت شود.
      const created = await createProductMutation.mutateAsync({
        name: newName.trim(),
        code,
        barcode,
        category: newCategory,
        brand: "",
        unit: newUnit.trim() || "عدد",
        // موجودی از صفر شروع می‌شود؛ خودِ تصمیمِ نگهداری بلافاصله
        // بعد از این، تعداد مازاد را اضافه می‌کند.
        stock: 0,
        purchasePrice: Number(newPurchasePrice) || 0,
        retailPrice: 0,
        wholesalePrice: 0,
        tax: 0,
        image: "",
      });
      onConfirm({
        linkedProductId: created.id,
        linkedProductCode: created.code,
        linkedProductName: created.name,
      });
    } catch {
      // پیام خطا را mutation نشان داده؛ اینجا فقط دیالوگ را باز
      // نگه می‌داریم.
    } finally {
      setIsCreating(false);
    }
  };

  const busy = isBusy || isCreating || createProductMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            اتصال کالای ثبت‌نشده
          </DialogTitle>
          <DialogDescription>
            «{item.productName}» در سیستم تعریف نشده است. چون تصمیم گرفته‌اید
            این کالا نزد ما بماند، باید مشخص کنید موجودیِ کدام کالا افزایش
            پیدا کند.
          </DialogDescription>
        </DialogHeader>

        {mode === "pick" ? (
          <div className="space-y-3">
            <ProductSearchPanel
              products={products}
              isAdded={() => false}
              onAdd={handlePick}
            />
            {isLoading && (
              <p className="text-xs text-muted-foreground text-center">
                در حال بارگذاری کالاها...
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-1.5"
              onClick={openCreateMode}
              disabled={busy}
            >
              <Plus className="h-4 w-4" />
              این کالا در فهرست نیست — ثبتش کن
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">نام کالا</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">دسته‌بندی</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="انتخاب..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">واحد شمارش</Label>
                <Input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">قیمت خرید (ریال)</Label>
                <Input
                  type="number"
                  dir="ltr"
                  min={0}
                  value={newPurchasePrice}
                  onChange={(e) => setNewPurchasePrice(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              کد کالا و بارکد خودکار تولید می‌شوند. موجودی از صفر شروع می‌شود و
              بلافاصله به‌اندازه‌ی همین مازاد افزایش می‌یابد. بقیه‌ی مشخصات را
              بعداً از صفحه‌ی کالاها می‌توانید کامل کنید.
            </p>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setMode("pick")}
              disabled={busy}
            >
              بازگشت به انتخاب از فهرست
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            انصراف
          </Button>
          {mode === "create" && (
            <Button
              type="button"
              onClick={handleCreate}
              disabled={busy || !newName.trim()}
            >
              {busy ? "در حال ثبت..." : "ثبت کالا و ادامه"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
