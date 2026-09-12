import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { usePurchaseReceivingInfoQuery } from "../services/queries";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { useReceivePurchaseMutation } from "../services/mutations";
import { useReceivingForm } from "../hooks/useReceivingForm";
import ReceivingItemsSection from "../components/forms/ReceivingItemsSection";
import ReceivingSummaryCard from "../components/forms/ReceivingSummaryCard";
import ReceivingTransporterSection from "../components/forms/ReceivingTransporterSection";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { ROUTES } from "@/shared/constants/routes";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

// سقفِ عکس‌های یک دورِ دریافت — `ReceivePurchaseCommand.Images` سقفی
// ندارد، این فقط یک حدِ عملی برای فرم است.
const MAX_RECEIVING_IMAGES = 10;

function ReceivingDetailForm({ receivingInfo }) {
  const navigate = useNavigate();
  const receiveMutation = useReceivePurchaseMutation();

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
    handleItemChange,
    isAllComplete,
    hasSomethingToReceive,
    buildCommand,
    resetForm,
  } = useReceivingForm(receivingInfo);

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

  const items = formData.items || [];

  const displayItems = useMemo(
    () =>
      items.map((item) => {
        const product = productMap.get(item.productId);
        return {
          ...item,
          // کلیدِ پایدار هم کنارِ URLِ امضاشده می‌آید تا اگر صفحه دیر باز
          // بماند، بندانگشتی بتواند خودش امضا را تازه کند.
          imageKey: product?.imageKey ?? null,
          imageUrl: product?.imageUrl ?? product?.image ?? null,
          brand: product?.brand || "",
        };
      }),
    [items, productMap],
  );

  const isBusy = receiveMutation.isPending || images.isUploading;

  const handleSubmit = () => {
    receiveMutation.mutate(buildCommand(images.filesPayload), {
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
          <ReceivingItemsSection
            items={displayItems}
            onItemChange={handleItemChange}
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                عکس‌های دریافت
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                عکسِ محموله، بارنامه یا کارتنِ آسیب‌دیده. عکس‌ها روی خودِ
                خرید ذخیره می‌شوند و در دورهای بعدی هم دیده می‌شوند.
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

          <ReceivingTransporterSection
            formData={formData}
            onFormChange={setFormData}
          />
        </div>

        <div className="space-y-4">
          <ReceivingSummaryCard formData={formData} onFormChange={setFormData} />

          <div className="flex gap-2">
            <Button
              className={`flex-1 gap-2 ${
                !isAllComplete && items.length > 0
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : ""
              }`}
              disabled={isBusy || !hasSomethingToReceive}
              onClick={() => setShowConfirmDialog(true)}
            >
              {isAllComplete ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {isAllComplete ? "تأیید دریافت کامل" : "ثبت دریافت (با کسری)"}
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

          <p className="text-xs text-muted-foreground text-center px-2">
            باقیمانده‌ای که این دور ثبت نکنید، برای محموله‌ی بعدی در همین
            لیست می‌ماند. اگر کالایی معیوب یا اشتباه رسیده، آن را از صفحه‌ی
            «مرجوعی خرید» ثبت کنید — این فرم فقط تعدادِ دریافتی را ثبت
            می‌کند.
          </p>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAllComplete ? "ثبت دریافت کامل" : "ثبت دریافت با کسری"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAllComplete
                ? "آیا مطمئن هستید که همه‌ی باقیمانده‌ی این خرید دریافت شده است؟ این مقدار همین حالا به موجودی اضافه می‌شود."
                : "فقط مقداری که وارد کرده‌اید به موجودی اضافه می‌شود؛ باقیمانده در انتظار محموله‌ی بعدی می‌ماند و این خرید همچنان در لیست دریافت باقی می‌ماند."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBusy}
              onClick={handleSubmit}
              className={!isAllComplete ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
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
          ? "دریافت کالا"
          : "خطا",
      showBack: true,
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, receivingInfo, isLoading]);

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
      key={receivingInfo.purchaseId}
      receivingInfo={receivingInfo}
    />
  );
}
