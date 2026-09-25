import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertTriangle, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
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
import FileUploadList from "@/shared/components/files/FileUploadList";
import RemoteImage from "@/shared/components/files/RemoteImage";
import { useFileUploadList } from "@/shared/hooks/useFileUploadList";
import { ImageFolderEnum } from "@/shared/domain/enums/imageFolder";
import { useHeaderStore } from "@/shared/store/headerStore";
import {
  usePurchaseReceivingInfoQuery,
  usePurchaseReturnPendingEffectsQuery,
} from "../services/queries";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { useReceiveShipmentMutation } from "../services/mutations";
import { useReceivingForm } from "../hooks/useReceivingForm";
import { useGoodsRoundForm } from "@/shared/hooks/useGoodsRoundForm";
import { EFFECT_DIRECTIONS } from "@/shared/domain/returns/effects";
import ReceivingItemsSection from "../components/forms/ReceivingItemsSection";
import ReceivingUnlistedItemsSection from "../components/forms/ReceivingUnlistedItemsSection";
import ReceivingQuarantineCard from "../components/forms/ReceivingQuarantineCard";
import ReceivingSummaryCard from "../components/forms/ReceivingSummaryCard";
import ReceivingTransporterSection from "../components/forms/ReceivingTransporterSection";
import GoodsRoundItemsSection from "@/shared/components/returns/GoodsRoundItemsSection";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { ROUTES } from "@/shared/constants/routes";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

// سقفِ عکس‌های یک دورِ دریافت — `ReceivePurchaseCommand.Images` سقفی
// ندارد، این فقط یک حدِ عملی برای فرم است.
const MAX_RECEIVING_IMAGES = 10;

function withProductImage(rows, productMap) {
  return rows.map((row) => {
    const product = productMap.get(row.productId);
    return {
      ...row,
      imageKey: product?.imageKey ?? null,
      imageUrl: product?.imageUrl ?? product?.image ?? null,
      brand: product?.brand || "",
    };
  });
}

/**
 * یک محموله‌ی ورودی از تامین‌کننده: اقلامِ خرید (با شمارش و خرابی)،
 * کالای سفارش‌نداده، و کالای جایگزینی که مرجوعی‌های همین خرید منتظرش‌اند
 * — همه با یک `ReceiveShipment` و در یک تراکنش.
 *
 * `replacementReturnId` (از صفِ «مرجوعی‌های در انتظار دریافت»، `?returnId=`):
 * فقط کالای جایگزینِ همان مرجوعی ثبت می‌شود؛ اقلامِ خرید، کالای
 * سفارش‌نداده، عکس‌ها و کارتِ قرنطینه که مالِ دریافتِ خودِ خریدند پنهان‌اند.
 */
function ReceivingDetailForm({ receivingInfo, replacementReturnId }) {
  const replacementOnly = replacementReturnId != null;
  const navigate = useNavigate();
  const receiveMutation = useReceiveShipmentMutation();

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

  const {
    formData,
    setFormData,
    items,
    unlistedItems,
    handleArrivedChange,
    handleAddDefect,
    handleUpdateDefect,
    handleRemoveDefect,
    handleAddUnlisted,
    handleRemoveUnlisted,
    isAllComplete,
    hasSomethingToReceive,
    buildCommand,
    resetForm,
  } = useReceivingForm(receivingInfo);

  // کالای جایگزینِ مرجوعی‌های همین خرید که هنوز نرسیده.
  const { data: pendingEffects = [] } = usePurchaseReturnPendingEffectsQuery(
    receivingInfo.purchaseId,
  );
  const replacementLines = useMemo(
    () =>
      pendingEffects
        .filter(
          (effect) =>
            effect.direction === EFFECT_DIRECTIONS.GOODS_IN &&
            effect.remainingQuantity > 0 &&
            (!replacementOnly ||
              effect.purchaseReturnId === replacementReturnId),
        )
        .map((effect) => ({
          effectId: effect.effectId,
          direction: effect.direction,
          returnId: effect.purchaseReturnId,
          reference: effect.returnNumber,
          productId: effect.productId,
          productCode: effect.productCode,
          productName: effect.productName,
          unit: effect.unit,
          remainingQuantity: effect.remainingQuantity,
        })),
    [pendingEffects, replacementOnly, replacementReturnId],
  );
  const replacement = useGoodsRoundForm(replacementLines, {
    withObservations: true,
    startEmpty: !replacementOnly,
  });

  // عکس‌های همین دور. `filesPayload` دقیقاً شکلِ
  // `ReceivePurchaseImageDto` است (`{objectKey, fileName?, note?}`).
  const images = useFileUploadList({
    folder: ImageFolderEnum.RECEIVING,
    maxCount: MAX_RECEIVING_IMAGES,
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    return () => resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayItems = useMemo(
    () => withProductImage(items, productMap),
    [items, productMap],
  );
  const displayReplacementRounds = useMemo(
    () => withProductImage(replacement.rounds, productMap),
    [replacement.rounds, productMap],
  );

  const isBusy = receiveMutation.isPending || images.isUploading;
  const hasSomething = replacementOnly
    ? replacement.hasSomethingToRecord
    : hasSomethingToReceive || replacement.hasSomethingToRecord;
  const complete = replacementOnly ? replacement.isAllComplete : isAllComplete;

  const handleSubmit = () => {
    // سربرگِ دورهای مرجوعی همان مشخصاتِ خودِ محموله است.
    const shipmentHeader = {
      date: formData.receivedDate,
      partyName: formData.driverFullName,
      vehiclePlate: formData.vehiclePlate,
      note: formData.receivingNote,
    };
    const command = {
      purchase: replacementOnly ? null : buildCommand(images.filesPayload),
      purchaseReturnRounds: replacement.buildCommandsByReturn(
        shipmentHeader,
        "purchaseReturnId",
      ),
      saleReturnRounds: [],
    };
    receiveMutation.mutate(command, {
      onSuccess: () => {
        setShowConfirmDialog(false);
        images.commit();
        resetForm();
        navigate(ROUTES.WAREHOUSE_RECEIVING);
      },
    });
  };

  const handleCancel = () => {
    images.discard();
    navigate(ROUTES.WAREHOUSE_RECEIVING);
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {!replacementOnly && (
            <ReceivingItemsSection
              items={displayItems}
              subtitle="تعدادِ رسیده را بشمارید؛ بیشتر از سفارش هم ثبت می‌شود. خرابی‌ها به قرنطینه می‌روند."
              onArrivedChange={handleArrivedChange}
              onAddDefect={handleAddDefect}
              onUpdateDefect={handleUpdateDefect}
              onRemoveDefect={handleRemoveDefect}
            />
          )}

          {!replacementOnly && (
            <ReceivingUnlistedItemsSection
              rows={unlistedItems}
              onAdd={handleAddUnlisted}
              onRemove={handleRemoveUnlisted}
              onArrivedChange={handleArrivedChange}
              onAddDefect={handleAddDefect}
              onUpdateDefect={handleUpdateDefect}
              onRemoveDefect={handleRemoveDefect}
            />
          )}

          {replacement.rounds.length > 0 && (
            <GoodsRoundItemsSection
              rounds={displayReplacementRounds}
              title="کالای جایگزینِ مرجوعی"
              subtitle={
                replacementOnly
                  ? "کالای جایگزینی که تامین‌کننده فرستاده. تعدادِ رسیده را تأیید کنید؛ اگر بخشی خراب است، ثبتش کنید."
                  : "تامین‌کننده این‌ها را به‌جای کالای مرجوعی می‌فرستد. اگر در همین محموله رسیده‌اند، ثبتشان کنید."
              }
              withObservations
              observationTexts={{
                emptyHint:
                  "اگر بخشی از کالای جایگزین خراب رسیده، ثبتش کنید. کالای خراب به قرنطینه می‌رود، نه موجودی.",
                healthySuffix: "عدد سالم به موجودی",
              }}
              onQuantityChange={replacement.handleQuantityChange}
              onAddObservation={replacement.handleAddObservation}
              onUpdateObservation={replacement.handleUpdateObservation}
              onRemoveObservation={replacement.handleRemoveObservation}
            />
          )}

          {!replacementOnly && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  عکس‌های دریافت
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  عکسِ محموله، بارنامه یا کارتنِ آسیب‌دیده. عکس‌ها روی خودِ خرید
                  ذخیره می‌شوند و در دورهای بعدی هم دیده می‌شوند.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <FileUploadList
                  list={images}
                  title="عکس‌های این دور"
                  emptyLabel="هنوز عکسی اضافه نشده است."
                  notePlaceholder="توضیح عکس (مثلاً: کارتن آسیب‌دیده)"
                  disabled={isBusy}
                />

                {/* عکس‌های دورهای قبل فقط نمایش داده می‌شوند؛ اگر داخلِ
                  آپلودر می‌نشستند، با هر دور دوباره فرستاده و روی سرور
                  تکراری ذخیره می‌شدند. */}
                {(formData.receivingImages || []).length > 0 && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-sm font-medium">عکس‌های دورهای قبل</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.receivingImages.map((image) => (
                        <figure key={image.id} className="w-24 space-y-1">
                          <RemoteImage
                            imageKey={image.objectKey}
                            imageUrl={image.url}
                            alt={image.fileName || "عکس دریافت"}
                            className="h-24 w-24 rounded-md border border-border object-cover"
                          />
                          {image.note && (
                            <figcaption className="text-[11px] text-muted-foreground line-clamp-2">
                              {image.note}
                            </figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <ReceivingTransporterSection
            formData={formData}
            onFormChange={setFormData}
          />
        </div>

        <div className="space-y-4">
          <ReceivingSummaryCard
            formData={formData}
            onFormChange={setFormData}
            replacementOnly={replacementOnly}
          />

          {!replacementOnly && (
            <ReceivingQuarantineCard receivingInfo={receivingInfo} />
          )}

          <div className="flex gap-2">
            <Button
              className={`flex-1 gap-2 ${
                !complete && (replacementOnly || items.length > 0)
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : ""
              }`}
              disabled={
                isBusy ||
                !hasSomething ||
                Boolean(replacementOnly && replacement.blockingReason)
              }
              onClick={() => setShowConfirmDialog(true)}
            >
              {complete ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {replacementOnly
                ? "ثبت دریافت جایگزین"
                : isAllComplete
                  ? "تأیید دریافت"
                  : "ثبت دریافت (با کسری)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isBusy}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              انصراف
            </Button>
          </div>

          {!replacementOnly && (
            <p className="text-xs text-muted-foreground text-center px-2">
              باقیمانده‌ای که این دور نرسیده برای محموله‌ی بعدی می‌ماند. کالای
              خراب، مازاد و سفارش‌نداده به قرنطینه می‌رود و با «ثبت مغایرت»
              تکلیفش روشن می‌شود.
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ثبت این محموله</AlertDialogTitle>
            <AlertDialogDescription>
              کالای سالمِ سهمِ سفارش به موجودی اضافه می‌شود؛ خرابی‌ها، مازاد و
              کالای سفارش‌نداده به قرنطینه می‌روند.
              {!isAllComplete &&
                " باقیمانده‌ی نرسیده در انتظار محموله‌ی بعدی می‌ماند."}
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

export default function ReceivingDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const replacementReturnId = searchParams.get("returnId")
    ? Number(searchParams.get("returnId"))
    : null;
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const {
    data: receivingInfo,
    isLoading,
    isError,
  } = usePurchaseReceivingInfoQuery(Number(id));

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : receivingInfo
          ? replacementReturnId != null
            ? "دریافت کالای جایگزین"
            : "دریافت کالا"
          : "خطا",
      showBack: true,
    });
    return () => clearHeader();
  }, [
    navigate,
    setHeader,
    clearHeader,
    receivingInfo,
    isLoading,
    replacementReturnId,
  ]);

  if (isLoading) return <WarehouseFormSkeleton />;

  if (isError || !receivingInfo) {
    return (
      <DetailErrorState
        message="خرید مورد نظر یافت نشد."
        onBack={() => navigate(ROUTES.WAREHOUSE_RECEIVING)}
      />
    );
  }

  return (
    <ReceivingDetailForm
      key={`${receivingInfo.purchaseId}:${replacementReturnId ?? ""}`}
      receivingInfo={receivingInfo}
      replacementReturnId={replacementReturnId}
    />
  );
}
