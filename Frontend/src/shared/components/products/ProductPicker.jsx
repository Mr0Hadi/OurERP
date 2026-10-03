import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import ProductSearchPanel from "@/shared/components/forms/ProductSearchPanel";
import SelectedItemsTable from "@/shared/components/forms/SelectedItemsTable";
import SelectedItemsCards from "@/shared/components/forms/SelectedItemsCards";
import toast from "react-hot-toast";
import { lineFromProduct } from "@/shared/domain/invoice/lineFromProduct";
import { useProductDetailLoader } from "@/features/warehouse/products/services/queries";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";
import {
  invoiceLineAmounts,
  invoiceTotals,
} from "@/shared/domain/invoice/lineMath";

/**
 * انتخاب کالا + فهرست اقلام انتخاب‌شده — یک‌جا و مشترک.
 *
 * تنها جای افزودن، حذف، ویرایشِ تعداد/قیمت و جمع‌زدن — برای هر سه
 * مصرف‌کننده: اقلام فروش، اقلام خرید، و کالای جایگزینِ مرجوعی.
 *
 * تفاوت‌های واقعیِ آن سه به‌شکل prop درآمده‌اند:
 *
 *   • priceOf   — فروش از قیمت فروش می‌خواند و خرید از قیمت خرید.
 *   • collapsible — در مرجوعی، انتخابگر نقش فرعی دارد و تاشو است، پس
 *     اقلامِ انتخاب‌شده بالا می‌آیند و خودِ انتخابگر پشتِ یک دکمه
 *     می‌رود؛ در فرم خرید/فروش برعکس، انتخابگر کارِ اصلی است و بالاست.
 *
 * افزودن کالایی که از قبل در فهرست است، تعدادش را یکی زیاد می‌کند —
 * چه از دکمه‌ی + و چه از اسکن بارکد.
 */

/**
 * جمعِ قلم با همان قاعده‌ی سرور (تخفیف و مالیات گرد، هر قلم جدا). قلمی
 * که نرخ مالیاتش معلوم نیست (کالای تازه‌انتخاب‌شده) بدون مالیات حساب
 * می‌شود؛ `showTaxHint` این را به کاربر می‌گوید.
 */
const lineTotalOf = (item) => invoiceLineAmounts(item).totalAmount;

export default function ProductPicker({
  items,
  onItemsChange,
  products = [],
  isLoading = false,
  priceOf = (product) => product.retailPrice ?? 0,
  emptyText = "هنوز کالایی انتخاب نشده",
  collapsible = false,
  openLabel = "انتخاب کالا",
  closeLabel = "بستن لیست کالاها",
  // اسکنِ بارکدِ دانه، کدش را روی همان قلم نگه می‌دارد (`productUnitBarcodes`).
  trackUnits = false,
  // فرم خرید/فروش: جمع با مالیات است و سرور مالیاتِ قلم‌های تازه را حساب می‌کند.
  showTaxHint = false,
}) {
  // در حالت تاشو، اگر هنوز چیزی انتخاب نشده باز باشد بهتر است — کاربر
  // برای همین آمده.
  const [isPickerOpen, setIsPickerOpen] = useState(items.length === 0);

  const loadProductDetail = useProductDetailLoader();
  // آخرین فهرستِ اقلام، برای افزودنی که بعد از رسیدنِ جزئیاتِ کالا انجام می‌شود —
  // تا تغییرهایی که کاربر در همین فاصله داده گم نشوند.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });
  // کالاهایی که جزئیاتشان در راه است: کلیکِ دوباره تعداد را زیاد می‌کند، نه قلمِ تکراری.
  const pendingRef = useRef(new Map());

  const addedQuantityOf = (productId) =>
    Number(items.find((item) => item.productId === productId)?.quantity) || 0;

  const handleAdd = (product, reference) => {
    const unitCode =
      trackUnits && reference?.kind === BarcodeReferenceKindEnum.UNIT
        ? reference.normalizedPayload
        : null;

    if (
      unitCode &&
      items.some((item) => (item.productUnitBarcodes || []).includes(unitCode))
    ) {
      toast.error("این دانه قبلاً اسکن شده است");
      return false;
    }

    const existing = items.find((item) => item.productId === product.id);
    if (existing) {
      onItemsChange(
        items.map((item) => {
          if (item.productId !== product.id) return item;
          const quantity = Number(item.quantity) || 0;
          if (!unitCode) return { ...item, quantity: quantity + 1 };
          // دانه‌های اسکن‌شده اول تعدادِ موجود را پر می‌کنند، بعد تعداد را زیاد.
          const codes = [...(item.productUnitBarcodes || []), unitCode];
          return {
            ...item,
            productUnitBarcodes: codes,
            quantity: Math.max(quantity, codes.length),
          };
        }),
      );
      return true;
    }
    if (pendingRef.current.has(product.id)) {
      pendingRef.current.get(product.id).quantity += 1;
      return true;
    }

    // قلمِ تازه: قیمت، واحد و مالیات فقط در جزئیاتِ کالا هست، نه در ردیفِ لیست.
    const pending = { quantity: 1 };
    pendingRef.current.set(product.id, pending);
    loadProductDetail(product.id)
      .catch((error) => {
        toast.error(getErrorMessage(error, "دریافت اطلاعات کالا انجام نشد."));
        return product;
      })
      .then((detail) => {
        pendingRef.current.delete(product.id);
        const source = { ...product, ...detail };
        onItemsChange([
          ...itemsRef.current,
          lineFromProduct(source, {
            unitPrice: priceOf(source),
            quantity: pending.quantity,
            productUnitBarcodes: unitCode ? [unitCode] : undefined,
          }),
        ]);
      });
    return true;
  };

  const handleRemove = (productId) =>
    onItemsChange(items.filter((item) => item.productId !== productId));

  const handleRemoveUnit = (productId, code) =>
    onItemsChange(
      items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              productUnitBarcodes: (item.productUnitBarcodes || []).filter(
                (candidate) => candidate !== code,
              ),
            }
          : item,
      ),
    );

  const handleFieldChange = (productId, field, value) =>
    onItemsChange(
      items.map((item) => {
        if (item.productId !== productId) return item;
        const next = { ...item, [field]: Number(value) >= 0 ? Number(value) : 0 };
        // کم‌کردنِ تعداد، دانه‌های اسکن‌شده‌ی اضافه را هم کنار می‌گذارد.
        if (field === "quantity" && item.productUnitBarcodes?.length > next.quantity) {
          next.productUnitBarcodes = item.productUnitBarcodes.slice(0, next.quantity);
        }
        return next;
      }),
    );

  const totals = invoiceTotals(items);
  const grandTotal = totals.totalAmount;

  /**
   * قلم‌هایی که از سرور آمده‌اند گاهی نام/کدِ کالا را ندارند؛ از فهرستِ کالاها
   * (که همین‌جا در دسترس است) پر می‌شوند — فقط برای نمایش، چیزی به state اضافه
   * نمی‌شود. (واحد و مالیات در ردیفِ لیست نیستند، پس از این راه پر نمی‌شوند.)
   */
  const displayItems = items.map((item) => {
    if (item.productName && item.productCode) return item;
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) return item;
    return {
      ...item,
      productName: item.productName || product.name,
      productCode: item.productCode || product.code,
    };
  });

  const selectedItems = items.length > 0 && (
    <>
      <SelectedItemsTable
        items={displayItems}
        taxAmount={totals.taxAmount}
        taxUnknown={showTaxHint && totals.taxUnknown}
        onFieldChange={handleFieldChange}
        onRemove={handleRemove}
        onRemoveUnit={trackUnits ? handleRemoveUnit : undefined}
        lineTotal={lineTotalOf}
        grandTotal={grandTotal}
      />
      <SelectedItemsCards
        items={displayItems}
        taxAmount={totals.taxAmount}
        taxUnknown={showTaxHint && totals.taxUnknown}
        onFieldChange={handleFieldChange}
        onRemove={handleRemove}
        onRemoveUnit={trackUnits ? handleRemoveUnit : undefined}
        lineTotal={lineTotalOf}
        grandTotal={grandTotal}
      />
    </>
  );

  const searchPanel = isLoading ? (
    <p className="text-xs text-muted-foreground text-center py-4">
      در حال بارگذاری کالاها...
    </p>
  ) : (
    <ProductSearchPanel
      products={products}
      addedQuantityOf={addedQuantityOf}
      onAdd={handleAdd}
    />
  );

  if (collapsible) {
    // تاشو یعنی داخلِ کارتِ یک تصمیمِ مرجوعی، با اقلام بالای انتخابگر.
    return (
      <div className="@container/picker space-y-2 rounded-md border border-border bg-card/60 p-2.5">
        {selectedItems}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs gap-1.5"
          onClick={() => setIsPickerOpen((open) => !open)}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              isPickerOpen ? "rotate-180" : ""
            }`}
          />
          {isPickerOpen ? closeLabel : openLabel}
        </Button>

        {isPickerOpen && searchPanel}
      </div>
    );
  }

  return (
    <div className="@container/picker space-y-4">
      {searchPanel}
      {selectedItems}
      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-3 border border-dashed border-border rounded-lg">
          {emptyText}
        </p>
      )}
    </div>
  );
}
