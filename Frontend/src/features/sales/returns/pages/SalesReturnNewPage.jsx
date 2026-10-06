import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/shared/components/ui/button";
import { useGoBack } from "@/shared/hooks/useGoBack";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { useClaimsInOtherReturns } from "@/shared/hooks/useClaimsInOtherReturns";
import { ROUTES } from "@/shared/constants/routes";
import { SALE_STATUS_LABELS } from "@/shared/domain/enums/saleStatus";
import { OFF_SCOPE_KIND_STYLES } from "@/shared/domain/returns/scopes";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import OrderInvoiceCard from "@/shared/components/returns/OrderInvoiceCard";
import ReturnItemsSection from "@/shared/components/returns/ReturnItemsSection";
import ReturnInfoSection from "@/shared/components/returns/ReturnInfoSection";
import ReturnPageSkeleton from "@/shared/components/returns/ReturnPageSkeleton";
import ReturnSourceError from "@/shared/components/returns/ReturnSourceError";
import ReturnSourcePicker from "@/shared/components/returns/ReturnSourcePicker";
import ReturnSubmitBar from "@/shared/components/returns/ReturnSubmitBar";
import { PreviousReturnBadge } from "@/shared/components/returns/ReturnChain";

import { useSalesReturnFormStore } from "../store/salesReturnFormStore";
import { useSalesReturnForm } from "../hooks/useSalesReturnForm";
import {
  useRelatedSalesReturnsQuery,
  useReturnableSalesQuery,
  useSaleForReturnQuery,
} from "../services/queries";
import { useCreateSalesReturnMutation } from "../services/mutations";
import {
  SALES_ON_ORDER_PROBLEM_LABELS,
  SALES_OFF_ORDER_PROBLEM_LABELS,
  OFF_SCOPE_KIND_LABELS,
} from "../domain/salesReturnVocabulary";

const SALES_SIDE = sideConfig(RETURN_SIDES.SALES);

/**
 * ثبتِ مرجوعی از فروش — مراحلِ عمودی روی یک صفحه.
 *
 * بالا: خودِ فاکتورِ فروش، همان‌طور که مشتری در دست دارد (بسته).
 * پایین: مشکل‌هایی که واحدِ فروش از مشتری می‌شنود، کنارِ هر کالا.
 *
 * ترتیب عمدی است: کاربر اول می‌بیند چه فروخته و تحویل شده، بعد می‌گوید
 * کدام بخشش مشکل دارد.
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
  const form = useSalesReturnForm();

  const { data: saleForReturn, isLoading, isError, error } = useSaleForReturnQuery(selectedSaleId);
  // ادعاهای مرجوعی‌های قبلیِ همین فروش، کنارِ هر کالا.
  const claimsElsewhere = useClaimsInOtherReturns("sale", selectedSaleId);

  // `?previousReturnId=` — از «ثبت مرجوعیِ بعدی» روی یک مرجوعیِ تسویه‌شده؛
  // فقط برای همان فروشی که در آدرس آمده، نه فروشی که کاربر بعداً عوض کرد.
  const previousReturnId =
    selectedSaleId != null && selectedSaleId === Number(searchParams.get("saleId"))
      ? Number(searchParams.get("previousReturnId")) || null
      : null;
  const { data: relatedReturns } = useRelatedSalesReturnsQuery(previousReturnId ? selectedSaleId : null);
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
    title: "ثبت مرجوعی از فروش",
    showBack: true,
    onBack: () => {
      resetForm();
      goBack();
    },
  });

  const createMutation = useCreateSalesReturnMutation();
  const hasClaims = form.allClaims.length > 0;

  const changeSale = (saleId) => {
    resetForm();
    setShowErrors(false);
    setSelectedSaleId(saleId);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!hasClaims) {
      setShowErrors(true);
      return;
    }
    createMutation.mutate(form.buildPayload());
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
          <ReturnSourcePicker
            title="انتخاب فاکتور فروش"
            hint="فقط فروش‌هایی که چیزی از آن‌ها به مشتری ارسال شده، مرجوعی می‌پذیرند."
            useReturnableQuery={useReturnableSalesQuery}
            partyKey="customerName"
            statusLabels={SALE_STATUS_LABELS}
            emptyText="فروشِ ارسال‌شده‌ای برای ثبتِ مرجوعی نیست"
            onSelect={changeSale}
          />
        )}

        {selectedSaleId && isLoading && <ReturnPageSkeleton />}

        {selectedSaleId && isError && (
          <ReturnSourceError
            error={error}
            fallback="اطلاعاتِ این فروش خوانده نشد"
            retryLabel="انتخاب فاکتور دیگر"
            onReset={() => changeSale(null)}
          />
        )}

        {isReady && (
          <>
            <PreviousReturnBadge
              id={formData.previousReturnId}
              number={previousReturn?.returnNumber}
              detailRoute={ROUTES.SALES_RETURNS_DETAIL}
            />

            <OrderInvoiceCard
              order={saleForReturn}
              partyName={saleForReturn.customerName}
              claimsSource={{ side: "sale", documentId: selectedSaleId }}
              // هر ادعا مقدارِ تحویل‌شده‌ی خودش را کنارش دارد؛ فاکتورِ کامل فقط مرجع است.
              defaultOpen={false}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => changeSale(null)}
              >
                انتخاب فاکتور دیگر
              </Button>
            </div>

            <ReturnItemsSection
              lines={form.lines}
              offScopeClaims={form.offScopeClaims}
              orderLines={form.orderLines}
              claimsElsewhere={claimsElsewhere}
              onAddClaim={form.handleAddClaim}
              onUpdateClaim={form.handleUpdateClaim}
              onRemoveClaim={form.handleRemoveClaim}
              onAddOffScope={form.handleAddOffScopeClaim}
              onUpdateOffScope={form.handleUpdateOffScopeClaim}
              onRemoveOffScope={form.handleRemoveOffScopeClaim}
              problemLabels={SALES_ON_ORDER_PROBLEM_LABELS}
              offScopeProblemLabels={SALES_OFF_ORDER_PROBLEM_LABELS}
              kindLabels={OFF_SCOPE_KIND_LABELS}
              kindStyles={OFF_SCOPE_KIND_STYLES}
              priceOf={SALES_SIDE.priceOf}
              description="برای هر کالا می‌توانید چند مشکل جدا با تعدادِ جداگانه ثبت کنید. سقفِ هر کالا مقدارِ ارسال‌شده‌ای است که هنوز در مرجوعیِ دیگری ادعا نشده. اگر بیشتر از فاکتور ارسال شده، «مازاد» را روی همان کالا ثبت کنید (با قیمتِ همان قلم)."
              emptyText="همه‌ی اقلامِ این فاکتور یا ارسال نشده‌اند یا قبلاً کامل در مرجوعی ادعا شده‌اند"
              unlistedHint="کالایی که اصلاً در فاکتور نیست ولی مشتری برگردانده؛ قیمتش دستی وارد می‌شود."
            />

            <ReturnInfoSection
              formData={formData}
              onFormChange={form.setFormData}
              counterparty={SALES_SIDE.counterparty}
            />

            {showErrors && !hasClaims && (
              <p className="text-xs text-destructive px-1">
                دست‌کم یک مشکل با تعدادِ بیشتر از صفر ثبت کنید
              </p>
            )}

            <ReturnSubmitBar
              total={form.computedTotal}
              submitLabel="ثبت مرجوعی"
              isBusy={createMutation.isPending}
              onCancel={handleCancel}
            />
          </>
        )}
      </form>
    </div>
  );
}
