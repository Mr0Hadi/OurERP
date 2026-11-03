import { useState } from "react";
import { ChevronDown, PackageOpen } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import ProductSearchPanel from "@/shared/components/forms/ProductSearchPanel";
import SelectedItemsTable from "@/shared/components/forms/SelectedItemsTable";
import SelectedItemsCards from "@/shared/components/forms/SelectedItemsCards";
import toast from "react-hot-toast";
import { lineFromProduct } from "@/shared/domain/invoice/lineFromProduct";
import { useDocumentProducts } from "@/features/warehouse/products/services/queries";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";
import {
  invoiceLineAmounts,
  invoiceTotals,
} from "@/shared/domain/invoice/lineMath";
import EmptyState from "@/shared/components/feedback/EmptyState";

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
  priceOf = (product) => product.retailPrice ?? 0,
  emptyText = "هنوز کالایی انتخاب نشده",
  collapsible = false,
  openLabel = "انتخاب کالا",
  closeLabel = "بستن لیست کالاها",
  // حالتِ تاشو: باز/بسته شدنِ فهرست.
  onPickerOpenChange,
  // اسکنِ بارکدِ دانه، کدش را روی همان قلم نگه می‌دارد (`productUnitBarcodes`).
  trackUnits = false,
  // فرم خرید/فروش: جمع با مالیات است و سرور مالیاتِ قلم‌های تازه را حساب می‌کند.
  showTaxHint = false,
}) {
  // در حالت تاشو، اگر هنوز چیزی انتخاب نشده باز باشد بهتر است — کاربر
  // برای همین آمده.
  const [isPickerOpen, setIsPickerOpen] = useState(items.length === 0);

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
    // ردیفِ فهرستِ کالا (و پاسخِ اسکن) قیمتِ خرید، واحد و مالیات را دارد (۲۰۲۶-۱۰-۳۰، بندِ ۹.۳)؛
    // قلم بی درخواستِ جزئیات اضافه می‌شود.
    onItemsChange([
      ...items,
      lineFromProduct(product, {
        unitPrice: priceOf(product),
        productUnitBarcodes: unitCode ? [unitCode] : undefined,
      }),
    ]);
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
   * قلم‌هایی که از سرور آمده‌اند گاهی نام/کدِ کالا را ندارند؛ جزئیاتِ فقط همان
   * کالاها گرفته و پر می‌شود — فقط برای نمایش، چیزی به state اضافه نمی‌شود.
   */
  const { productMap } = useDocumentProducts(
    items.filter((item) => !(item.productName && item.productCode)).map((item) => item.productId),
  );
  const displayItems = items.map((item) => {
    if (item.productName && item.productCode) return item;
    const product = productMap.get(Number(item.productId));
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
        showFooter={collapsible}
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
        showFooter={collapsible}
      />
    </>
  );

  const searchPanel = (
    <ProductSearchPanel
      addedQuantityOf={addedQuantityOf}
      onAdd={handleAdd}
    />
  );

  if (collapsible) {
    // تاشو یعنی داخلِ کارتِ یک تصمیمِ مرجوعی، با اقلام بالای انتخابگر.
    return (
      // بی‌جعبه: صاحبِ تاشو (تصمیمِ مرجوعی) خودش قاب دارد و جعبه‌ی دیگر روی موبایل
      // فقط عرض می‌خورد.
      <div className="@container/picker space-y-2">
        {selectedItems}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full h-auto min-h-10 gap-1.5 whitespace-normal py-2 text-sm sm:min-h-8 sm:py-1.5 sm:text-xs"
          onClick={() => {
            setIsPickerOpen(!isPickerOpen);
            onPickerOpenChange?.(!isPickerOpen);
          }}
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
    <div className="@container/picker space-y-3">
      {searchPanel}
      {selectedItems}
      {items.length === 0 && (
        <EmptyState size="sm" icon={PackageOpen} title={emptyText} />
      )}
    </div>
  );
}
