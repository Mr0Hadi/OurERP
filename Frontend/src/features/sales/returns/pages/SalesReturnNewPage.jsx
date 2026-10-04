import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGoBack } from "@/shared/hooks/useGoBack";
import { Save, X, AlertCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { useSalesReturnFormStore } from "../store/salesReturnFormStore";
import { useSalesReturnForm } from "../hooks/useSalesReturnForm";
import {
  useRelatedSalesReturnsQuery,
  useSaleForReturnQuery,
} from "../services/queries";
import { useCreateSalesReturnMutation } from "../services/mutations";

import SalesReturnSaleSection from "../components/forms/SalesReturnSaleSection";
import OrderInvoiceCard from "@/shared/components/returns/OrderInvoiceCard";
import { PreviousReturnBadge } from "@/shared/components/returns/ReturnChain";
import ReturnItemsSection from "@/shared/components/returns/ReturnItemsSection";
import { useClaimsInOtherReturns } from "@/shared/hooks/useClaimsInOtherReturns";
import {
  SALES_ON_ORDER_PROBLEM_LABELS,
  SALES_OFF_ORDER_PROBLEM_LABELS,
  OFF_SCOPE_KIND_LABELS,
} from "../domain/salesReturnVocabulary";
import { OFF_SCOPE_KIND_STYLES } from "@/shared/domain/returns/scopes";
import SalesReturnInfoSection from "../components/forms/SalesReturnInfoSection";
import SalesReturnDetailLoading from "../components/forms/SalesReturnDetailLoading";
import { ROUTES } from "@/shared/constants/routes";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * ثبت درخواست مرجوعی — دو مرحله‌ی عمودی روی یک صفحه.
 *
 * بالا: خودِ فاکتور فروش، همان‌طور که مشتری در دست دارد.
 * پایین: مشکل‌هایی که واحد فروش از او می‌شنود.
 *
 * ترتیب عمدی است: کاربر اول باید ببیند چه چیزی فروخته و تحویل شده،
 * بعد بگوید کدام بخشش مشکل دارد. چیدمان قبلی این دو را کنار هم در دو
 * ستون می‌گذاشت و فاکتور به یک کارت خلاصه در سایدبار تقلیل پیدا
 * می‌کرد.
 */
export default function SalesReturnNewPage() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [searchParams] = useSearchParams();

  const [selectedSaleId, setSelectedSaleId] = useState(
    searchParams.get("saleId") ? Number(searchParams.get("saleId")) : null,
  );
  const [showErrors, setShowErrors] = useState(false);

  const { formData, resetForm, initializeForSale } = useSalesReturnFormStore();
  const {
    setFormData,
    lines,
    orderLines,
    offInvoiceClaims,
    allClaims,
    handleAddClaim,
    handleUpdateClaim,
    handleRemoveClaim,
    handleAddOffInvoiceClaim,
    handleUpdateOffInvoiceClaim,
    handleRemoveOffInvoiceClaim,
    computedTotal,
    buildPayload,
  } = useSalesReturnForm();

  const {
    data: saleForReturn,
    isLoading,
    isError,
    error,
  } = useSaleForReturnQuery(selectedSaleId);
  // ادعاهای مرجوعی‌های قبلیِ همین فروش، کنارِ هر کالا.
  const claimsElsewhere = useClaimsInOtherReturns("sale", selectedSaleId);

  // `?previousReturnId=` — از «ثبت مرجوعیِ بعدی» روی یک مرجوعیِ تسویه‌شده؛
  // فقط برای همان فروشی که در آدرس آمده، نه فروشی که کاربر بعداً عوض کرد.
  const previousReturnId =
    selectedSaleId != null && selectedSaleId === Number(searchParams.get("saleId"))
      ? Number(searchParams.get("previousReturnId")) || null
      : null;
  const { data: relatedReturns } = useRelatedSalesReturnsQuery(
    previousReturnId ? selectedSaleId : null,
  );
  const previousReturn = relatedReturns?.find((ret) => ret.id === previousReturnId);

  useEffect(() => {
    resetForm();
    return () => resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (saleForReturn) initializeForSale(saleForReturn, { previousReturnId });
  }, [saleForReturn, initializeForSale, previousReturnId]);

  // «بازگشت» پیش‌نویسِ فرم را هم پاک می‌کند.
  usePageHeader({
    title: "ثبت درخواست مرجوعی",
    showBack: true,
    onBack: () => {
      resetForm();
      goBack();
    },
  });

  const createMutation = useCreateSalesReturnMutation();
  const isBusy = createMutation.isPending;
  const hasClaims = allClaims.length > 0;

  const handleSelectSale = (saleId) => {
    resetForm();
    setSelectedSaleId(saleId);
  };

  const handleClearSale = () => {
    resetForm();
    setSelectedSaleId(null);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!hasClaims) {
      setShowErrors(true);
      return;
    }
    createMutation.mutate(buildPayload());
  };

  const handleCancel = () => {
    resetForm();
    navigate(ROUTES.SALES_RETURNS_LIST);
  };

  const isReady = Boolean(selectedSaleId && saleForReturn && !isLoading);

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit} className="space-y-4">
        {!selectedSaleId && (
          <SalesReturnSaleSection selectedSale={null} onSelect={handleSelectSale} />
        )}

        {selectedSaleId && isLoading && <SalesReturnDetailLoading />}

        {selectedSaleId && isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-border rounded-lg">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {getErrorMessage(error, "این فروش قابل مرجوع‌کردن نیست")}
            </p>
            <Button type="button" variant="outline" onClick={handleClearSale}>
              انتخاب فروش دیگر
            </Button>
          </div>
        )}

        {isReady && (
          <>
            {/* ── بالا: جزئیات فروش ────────────────────────────────── */}
            <PreviousReturnBadge
              id={formData.previousReturnId}
              number={previousReturn?.returnNumber}
              detailRoute={ROUTES.SALES_RETURNS_DETAIL}
            />

            <OrderInvoiceCard
              order={saleForReturn}
              partyName={saleForReturn.customerName}
              claimsElsewhere={claimsElsewhere}
              // هر ادعا مقدارِ تحویل‌شده‌ی خودش را کنارش دارد؛ فاکتورِ کامل فقط مرجع است.
              defaultOpen={false}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleClearSale}
              >
                انتخاب فاکتور دیگر
              </Button>
            </div>

            {/* ── پایین: ثبت مشکلات ────────────────────────────────── */}
            <ReturnItemsSection
              lines={lines}
              offScopeClaims={offInvoiceClaims}
              orderLines={orderLines}
              claimsElsewhere={claimsElsewhere}
              onAddClaim={handleAddClaim}
              onUpdateClaim={handleUpdateClaim}
              onRemoveClaim={handleRemoveClaim}
              onAddOffScope={handleAddOffInvoiceClaim}
              onUpdateOffScope={handleUpdateOffInvoiceClaim}
              onRemoveOffScope={handleRemoveOffInvoiceClaim}
              problemLabels={SALES_ON_ORDER_PROBLEM_LABELS}
              offScopeProblemLabels={SALES_OFF_ORDER_PROBLEM_LABELS}
              kindLabels={OFF_SCOPE_KIND_LABELS}
              kindStyles={OFF_SCOPE_KIND_STYLES}
              description="برای هر کالا می‌توانید چند مشکل جدا با تعداد جداگانه ثبت کنید. سقف هر کالا همان مقداری است که به مشتری تحویل شده؛ اگر بیشتر از فاکتور ارسال شده، «مازاد» را روی همان کالا ثبت کنید (با قیمت همان خط)."
              emptyText="این فاکتور قلمی برای ادعا ندارد"
              unlistedHint="کالایی که اصلاً در فاکتور نیست؛ قیمتش دستی وارد می‌شود."
            />

            <SalesReturnInfoSection
              formData={formData}
              onFormChange={setFormData}
            />

            {showErrors && !hasClaims && (
              <p className="text-xs text-destructive px-1">
                حداقل یک مشکل با تعداد بیشتر از صفر باید ثبت شود
              </p>
            )}

            {/* چسبان: جمع و دکمه‌ی ثبت با اسکرولِ ادعاها از دید نمی‌روند. */}
            <div className="sticky bottom-0 z-20 -mx-4 sm:mx-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t sm:border border-border sm:rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-3">
              <div className="text-sm">
                <span className="text-muted-foreground">
                  جمع مبلغ ادعای مرجوعی:{" "}
                </span>
                <span className="font-bold text-card-foreground">
                  {formatRial(computedTotal)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="gap-2" disabled={isBusy}>
                  <Save className="h-4 w-4" />
                  {isBusy ? "در حال ثبت..." : "ثبت درخواست مرجوعی"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handleCancel}
                  disabled={isBusy}
                >
                  <X className="h-4 w-4" />
                  انصراف
                </Button>
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
