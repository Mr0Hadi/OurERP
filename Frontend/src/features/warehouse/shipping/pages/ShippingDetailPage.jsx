import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertTriangle, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useHeaderStore } from "@/shared/store/headerStore";
import {
  useSaleForShippingQuery,
  useSaleReturnPendingEffectsQuery,
} from "../services/queries";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { useDispatchShipmentMutation } from "../services/mutations";
import { useShippingForm } from "../hooks/useShippingForm";
import { useGoodsRoundForm } from "@/shared/hooks/useGoodsRoundForm";
import { EFFECT_DIRECTIONS } from "@/shared/domain/returns/effects";
import ShippingItemsSection from "../components/forms/ShippingItemsSection";
import ShippingSummaryCard from "../components/forms/ShippingSummaryCard";
import ShippingTransporterSection from "../components/forms/ShippingTransporterSection";
import GoodsRoundItemsSection from "@/shared/components/returns/GoodsRoundItemsSection";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { ROUTES } from "@/shared/constants/routes";
import { isExcessAllowedFor } from "../domain/shippingVocabulary";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

function withProductImage(rows, productMap) {
  return rows.map((row) => {
    const product = productMap.get(row.productId);
    return {
      ...row,
      imageKey: product?.imageKey ?? null,
      imageUrl: product?.imageUrl ?? product?.image ?? null,
    };
  });
}

/**
 * یک محموله‌ی خروجی برای مشتری: اقلامِ فروش (با مازاد و اسکن)، و کالای
 * جایگزینی که مرجوعی‌های همین فروش باید برای مشتری بفرستند — همه با یک
 * `DispatchShipment` و در یک تراکنش.
 */
/**
 * @param replacementReturnId از صفِ «مرجوعی‌های در انتظار ارسال» (`?returnId=`):
 *   فقط کالای جایگزینِ همان مرجوعی ارسال می‌شود و اقلامِ خودِ فروش پنهان‌اند.
 */
function ShippingDetailForm({ sale, replacementReturnId }) {
  const replacementOnly = replacementReturnId != null;
  const navigate = useNavigate();
  const dispatchMutation = useDispatchShipmentMutation();

  const { data: productsData } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );
  const productMap = useMemo(() => {
    const map = new Map();
    (productsData?.items || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [productsData]);

  const isTracked = useCallback(
    (productId) => Boolean(productMap.get(productId)?.requiresUnitTracking),
    [productMap],
  );

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
  const { data: pendingEffects = [] } = useSaleReturnPendingEffectsQuery(sale.id);
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

  const displayItems = useMemo(() => withProductImage(items, productMap), [items, productMap]);
  const displayReplacementRounds = useMemo(
    () => withProductImage(replacement.rounds, productMap),
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
        navigate(ROUTES.WAREHOUSE_SHIPPING);
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
          <ShippingSummaryCard formData={formData} onFormChange={setFormData} />

          {blocking && hasSomething && (
            <p className="text-xs text-destructive px-1">{blocking}</p>
          )}

          <div className="flex gap-2">
            <Button
              className={`flex-1 gap-2 ${
                !complete && (replacementOnly || items.length > 0)
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : ""
              }`}
              disabled={isBusy || !hasSomething || Boolean(blocking)}
              onClick={() => setShowConfirmDialog(true)}
            >
              {complete ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {replacementOnly
                ? "ثبت ارسال جایگزین"
                : isAllComplete
                  ? "تأیید ارسال"
                  : "ثبت ارسال (ناقص)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.WAREHOUSE_SHIPPING)}
              disabled={isBusy}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              انصراف
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center px-2">
            باقیمانده‌ای که این دور ارسال نکنید، برای دور بعدی در همین لیست
            باقی می‌ماند.
          </p>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ثبت این محموله</AlertDialogTitle>
            <AlertDialogDescription>
              همه‌ی مقادیرِ واردشده (ارسالی، مازاد و جایگزینِ مرجوعی) همین حالا
              از موجودی کم می‌شوند.
              {!isAllComplete &&
                " باقیمانده‌ی سفارش در انتظار محموله‌ی بعدی می‌ماند."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>انصراف</AlertDialogCancel>
            <AlertDialogAction disabled={isBusy} onClick={handleSubmit}>
              {isBusy ? "در حال ثبت..." : "تأیید"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: sale, isLoading, isError } = useSaleForShippingQuery(Number(id));

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : sale
          ? replacementReturnId != null
            ? "ارسال کالای جایگزین"
            : "ارسال کالا"
          : "خطا",
      showBack: true,
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, sale, isLoading, replacementReturnId]);

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
        message="فروش مورد نظر یافت نشد."
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
