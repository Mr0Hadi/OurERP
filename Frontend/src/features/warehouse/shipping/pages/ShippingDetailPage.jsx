import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import {
  useSaleForShippingQuery,
  useSaleReturnPendingEffectsQuery,
} from "../services/queries";
import { useDocumentProducts } from "@/features/warehouse/products/services/queries";
import { useDispatchShipmentMutation } from "../services/mutations";
import { useShippingForm } from "../hooks/useShippingForm";
import { useGoodsRoundForm } from "@/shared/hooks/useGoodsRoundForm";
import { EFFECT_DIRECTIONS } from "@/shared/domain/returns/effects";
import ShippingItemsSection from "../components/forms/ShippingItemsSection";
import ShippingSummaryCard from "../components/forms/ShippingSummaryCard";
import ShippingTransporterSection from "../components/forms/ShippingTransporterSection";
import GoodsRoundItemsSection from "@/shared/components/returns/GoodsRoundItemsSection";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { isExcessAllowedFor } from "../domain/shippingVocabulary";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { trackedLookup, withProductInfo } from "../../shared/productInfo";
import WarehouseSubmitBar from "../../shared/WarehouseSubmitBar";

/**
 * یک محموله‌ی خروجی برای مشتری: اقلامِ فروش (با مازاد و اسکن)، و کالای
 * جایگزینی که مرجوعی‌های همین فروش باید برای مشتری بفرستند — همه با یک
 * `DispatchShipment` و در یک تراکنش.
 *
 * @param replacementReturnId `?returnId=` — از دکمه‌ی «ارسال کالا برای مشتری»
 *   در صفحه‌ی مرجوعی: فقط کالای جایگزینِ همان مرجوعی ارسال می‌شود و اقلامِ
 *   خودِ فروش پنهان‌اند.
 */
function ShippingDetailForm({ sale, replacementReturnId }) {
  const replacementOnly = replacementReturnId != null;
  const navigate = useNavigate();
  const dispatchMutation = useDispatchShipmentMutation();

  // کالاهای همین فروش (و جایگزین‌های مرجوعی‌اش): تصویر، و اینکه اسکنِ دانه
  // الزامی است. تا نیامده‌اند، ثبت بسته است — وگرنه کالای ردیابی‌پذیر بی‌اسکن
  // فرستاده و سرور ردش می‌کرد.
  const { data: pendingEffects = [] } = useSaleReturnPendingEffectsQuery(sale.id);
  const { productMap, isLoading: productsLoading } = useDocumentProducts([
    ...(sale.items || []).map((item) => item.productId),
    ...pendingEffects.map((effect) => effect.productId),
  ]);
  const isTracked = useMemo(() => trackedLookup(productMap), [productMap]);

  const {
    formData,
    setFormData,
    items,
    handleItemChange,
    handleExcessChange,
    handleBarcodesChange,
    isAllComplete,
    hasSomethingToShip,
    blockingReason,
    buildCommand,
    resetForm,
  } = useShippingForm(sale, { isTracked });

  // کالای جایگزینِ مرجوعی‌های همین فروش که هنوز برای مشتری نرفته.
  const replacementLines = useMemo(
    () =>
      pendingEffects
        .filter(
          (effect) =>
            effect.direction === EFFECT_DIRECTIONS.GOODS_OUT &&
            effect.remainingQuantity > 0 &&
            (!replacementOnly || effect.saleReturnId === replacementReturnId),
        )
        .map((effect) => ({
          effectId: effect.effectId,
          direction: effect.direction,
          returnId: effect.saleReturnId,
          reference: effect.returnNumber,
          productId: effect.productId,
          productCode: effect.productCode,
          productName: effect.productName,
          unit: effect.unit,
          remainingQuantity: effect.remainingQuantity,
        })),
    [pendingEffects, replacementOnly, replacementReturnId],
  );
  const replacementBarcodesRequired = useCallback(
    (line) => isTracked(line.productId),
    [isTracked],
  );
  const replacement = useGoodsRoundForm(replacementLines, {
    barcodesRequired: replacementBarcodesRequired,
    // وقتی کاربر فقط برای همین جایگزین آمده، مقدارها از اول پرند.
    startEmpty: !replacementOnly,
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    return () => resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayItems = useMemo(() => withProductInfo(items, productMap), [items, productMap]);
  const displayReplacementRounds = useMemo(
    () => withProductInfo(replacement.rounds, productMap),
    [replacement.rounds, productMap],
  );

  const isBusy = dispatchMutation.isPending;
  const hasSomething = replacementOnly
    ? replacement.hasSomethingToRecord
    : hasSomethingToShip || replacement.hasSomethingToRecord;
  const blocking = replacementOnly
    ? replacement.blockingReason
    : (blockingReason ?? replacement.blockingReason);
  const complete = replacementOnly ? replacement.isAllComplete : isAllComplete;

  // جایگزینِ تنها از صفحه‌ی همان مرجوعی باز می‌شود؛ بعد از ثبت یا لغو
  // کاربر به همان سند برمی‌گردد، نه صفِ ارسالِ انبار.
  const exitRoute = replacementOnly
    ? routeWithId(ROUTES.SALES_RETURNS_DETAIL, replacementReturnId)
    : ROUTES.WAREHOUSE_SHIPPING;

  const handleSubmit = () => {
    const shipmentHeader = {
      date: formData.shippedDate,
      partyName: formData.driverFullName,
      vehiclePlate: formData.vehiclePlate,
      note: formData.shippingNote,
    };
    const command = {
      sale: replacementOnly ? null : buildCommand(),
      saleReturnRounds: replacement.buildCommandsByReturn(
        shipmentHeader,
        "saleReturnId",
      ),
      purchaseReturnRounds: [],
    };
    dispatchMutation.mutate(command, {
      onSuccess: () => {
        setShowConfirmDialog(false);
        resetForm();
        navigate(exitRoute);
      },
    });
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {!replacementOnly && (
            <ShippingItemsSection
              items={displayItems}
              isTracked={isTracked}
              allowExcess={isExcessAllowedFor(sale.status)}
              onItemChange={handleItemChange}
              onExcessChange={handleExcessChange}
              onBarcodesChange={handleBarcodesChange}
            />
          )}

          {replacement.rounds.length > 0 && (
            <GoodsRoundItemsSection
              rounds={displayReplacementRounds}
              title="کالای جایگزینِ مرجوعی"
              subtitle={
                replacementOnly
                  ? `کالای جایگزین برای ${sale.customerName || "مشتری"}. مقدارِ ارسالیِ این دور را تأیید کنید.`
                  : "طبق تصمیمِ مرجوعی باید برای مشتری ارسال شود. اگر با همین محموله می‌رود، ثبتش کنید."
              }
              withBarcodes
              onQuantityChange={replacement.handleQuantityChange}
              onBarcodesChange={replacement.handleBarcodesChange}
            />
          )}

          <ShippingTransporterSection
            formData={formData}
            onFormChange={setFormData}
          />
        </div>

        <div className="space-y-4">
          <ShippingSummaryCard
            formData={formData}
            onFormChange={setFormData}
            replacementOnly={replacementOnly}
          />

          <WarehouseSubmitBar
            label={
              replacementOnly
                ? "ثبت ارسال جایگزین"
                : isAllComplete
                  ? "تأیید ارسال"
                  : "ثبت ارسال (ناقص)"
            }
            complete={complete}
            warnIncomplete={replacementOnly || items.length > 0}
            canSubmit={hasSomething && !productsLoading}
            blockingReason={blocking}
            isBusy={isBusy}
            onSubmit={() => setShowConfirmDialog(true)}
            onCancel={() => navigate(exitRoute)}
            hint="باقیمانده‌ای که این دور ارسال نکنید، برای دور بعدی می‌ماند."
          />
        </div>
      </div>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title={replacementOnly ? "ثبت ارسال جایگزین" : "ثبت این محموله"}
        description={
          replacementOnly
            ? "کالای جایگزین همین حالا از موجودی کم می‌شود."
            : `همه‌ی مقادیرِ واردشده (ارسالی، مازاد و جایگزینِ مرجوعی) همین حالا از موجودی کم می‌شوند.${
                isAllComplete ? "" : " باقیمانده‌ی سفارش در انتظار محموله‌ی بعدی می‌ماند."
              }`
        }
        destructive={false}
        pendingLabel="در حال ثبت..."
        isPending={isBusy}
        onConfirm={handleSubmit}
      />
    </div>
  );
}

export default function ShippingDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const replacementReturnId = searchParams.get("returnId")
    ? Number(searchParams.get("returnId"))
    : null;
  const navigate = useNavigate();

  const { data: sale, isLoading, isError, error: loadError, refetch: retryLoad } = useSaleForShippingQuery(Number(id));

  usePageHeader({
    title: isLoading
      ? "در حال بارگذاری..."
      : sale
        ? replacementReturnId != null
          ? "ارسال کالای جایگزین"
          : "ارسال کالا"
        : "خطا",
    showBack: true,
  });

  if (isLoading)
    return (
      <WarehouseFormSkeleton
        itemActionSlot={false}
        summaryRows={2}
        hasSecondaryAction={false}
      />
    );

  if (isError || !sale) {
    return (
      <DetailErrorState
        error={loadError}
        notFoundMessage="فروش مورد نظر یافت نشد."
        onRetry={retryLoad}
        onBack={() => navigate(ROUTES.WAREHOUSE_SHIPPING)}
      />
    );
  }

  return (
    <ShippingDetailForm
      key={`${sale.id}:${replacementReturnId ?? ""}`}
      sale={sale}
      replacementReturnId={replacementReturnId}
    />
  );
}
