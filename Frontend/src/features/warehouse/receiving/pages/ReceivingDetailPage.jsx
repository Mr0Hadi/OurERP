import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, AlertTriangle, X } from "lucide-react";
import { toast } from "react-hot-toast";

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
import { useReceivingPurchaseQuery } from "../services/queries";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { useConfirmReceivingMutation } from "../services/mutations";
import { useReceivingForm } from "../hooks/useReceivingForm";
import ReceivingItemsSection from "../components/forms/ReceivingItemsSection";
import ReceivingSummaryCard from "../components/forms/ReceivingSummaryCard";
import ReceivingMismatchList from "../components/forms/ReceivingMismatchList";
import ReceivingTransporterSection from "../components/forms/ReceivingTransporterSection";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { ROUTES } from "@/shared/constants/routes";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

function ReceivingDetailForm({ purchase }) {
  const navigate = useNavigate();
  const receivingMutation = useConfirmReceivingMutation();

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
    handleAddIssue,
    handleUpdateIssue,
    handleRemoveIssue,
    isAllComplete,
    isTransporterValid,
    buildPayload,
    resetForm,
  } = useReceivingForm(purchase);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showTransporterError, setShowTransporterError] = useState(false);

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
          image: product?.image || "",
          brand: product?.brand || "",
        };
      }),
    [items, productMap],
  );

  const isBusy = receivingMutation.isPending;

  // انباردار فقط دریافت و (در صورت وجود) نوع مشکل واقعی را ثبت
  // می‌کند. دیگر لازم نیست کل کسری را توضیح دهد — هر بخشی که گزارش
  // نشود خودکار «در انتظار محموله بعدی» تلقی می‌شود.
  const handleConfirmClick = () => {
    if (!isTransporterValid) {
      setShowTransporterError(true);
      return;
    }
    setShowTransporterError(false);
    setShowConfirmDialog(true);
  };

  const handleSubmit = () => {
    const payload = buildPayload();
    const hasShortage = displayItems.some(
      (item) => (item.receivedQty || 0) < item.expectedQty,
    );

    receivingMutation.mutate(
      { purchaseId: payload.id, receivingData: payload },
      {
        onSuccess: () => {
          setShowConfirmDialog(false);
          resetForm();
          if (hasShortage) {
            toast.success(
              "دریافت ثبت شد. اگر مشکلی گزارش شده، برای واحد خرید ارسال شد؛ باقیمانده منتظر محموله بعدی می‌ماند.",
            );
          }
          navigate(ROUTES.WAREHOUSE_RECEIVING);
        },
      },
    );
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ReceivingItemsSection
            items={displayItems}
            onItemChange={handleItemChange}
            onAddIssue={handleAddIssue}
            onUpdateIssue={handleUpdateIssue}
            onRemoveIssue={handleRemoveIssue}
          />
          <ReceivingMismatchList items={displayItems} />
          <ReceivingTransporterSection
            formData={formData}
            onFormChange={(patch) => {
              setFormData(patch);
              if (showTransporterError) setShowTransporterError(false);
            }}
            error={
              showTransporterError
                ? "برای ثبت دریافت، نام تحویل‌دهنده و حداقل یکی از کد ملی یا شماره پلاک الزامی است"
                : null
            }
          />
        </div>

        <div className="space-y-4">
          <ReceivingSummaryCard
            formData={formData}
            onFormChange={setFormData}
          />

          <div className="flex gap-2">
            <Button
              className={`flex-1 gap-2 ${
                !isAllComplete && items.length > 0
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : ""
              }`}
              disabled={isBusy || items.length === 0}
              onClick={handleConfirmClick}
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
              onClick={() => navigate(ROUTES.WAREHOUSE_RECEIVING)}
              disabled={isBusy}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              انصراف
            </Button>
          </div>

          {items.every((i) => !(i.receivedQty > 0)) && (
            <p className="text-xs text-muted-foreground text-center px-2">
              این خرید هنوز هیچ دریافتی ندارد. اگر اساساً نباید دریافت شود،
              از صفحه‌ی جزئیات خرید می‌توانید آن را لغو کنید.
            </p>
          )}
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
                ? "آیا مطمئن هستید که همه اقلام به‌طور کامل دریافت شده‌اند؟"
                : "بخشی که به‌عنوان مشکل گزارش کرده‌اید برای واحد خرید ارسال می‌شود. بخشی که گزارش نکرده‌اید در انتظار محموله بعدی می‌ماند و این خرید همچنان در لیست دریافت باقی می‌ماند."}
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

  const { data: purchase, isLoading, isError } = useReceivingPurchaseQuery(Number(id));

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : purchase
          ? "دریافت کالا"
          : "خطا",
      showBack: true,
      onBack: () => navigate(ROUTES.WAREHOUSE_RECEIVING),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, purchase, isLoading]);

  if (isLoading) return <WarehouseFormSkeleton />;

  if (isError || !purchase) {
    return (
      <DetailErrorState
        message="خرید مورد نظر یافت نشد."
        onBack={() => navigate(ROUTES.WAREHOUSE_RECEIVING)}
      />
    );
  }

  return <ReceivingDetailForm key={purchase.id} purchase={purchase} />;
}