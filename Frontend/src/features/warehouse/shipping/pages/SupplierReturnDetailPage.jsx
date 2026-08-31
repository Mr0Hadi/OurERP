import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, AlertTriangle, X } from "lucide-react";
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
import { usePurchaseReturnQuery } from "@/features/purchases/returns/services/queries";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { buildGoodsLines } from "@/shared/domain/returns/resolutions";
import { EFFECT_KINDS } from "@/shared/domain/returns/effects";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import ReturnSummaryCard from "@/shared/components/returns/ReturnSummaryCard";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";

import { useConfirmSupplierReturnShipmentMutation } from "../services/mutations";
import { useShippingFormStore } from "../store/shippingFormStore";
import { useShippingForm } from "../hooks/useShippingForm";
import ShippingItemsSection from "../components/forms/ShippingItemsSection";
import ShippingTransporterSection from "../components/forms/ShippingTransporterSection";
import { ROUTES } from "@/shared/constants/routes";

const PURCHASE_SIDE = sideConfig(RETURN_SIDES.PURCHASE);

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

/**
 * عودت کالا به تامین‌کننده.
 *
 * صفحه‌ی جدا دارد چون برخلاف کالای جایگزینِ مشتری، هیچ سندِ خروجی‌ای
 * به سمت تامین‌کننده وجود ندارد که این کالا با آن برود — قرینه‌ی
 * دقیقِ همان حالتی که در دریافت، کالای برگشتیِ مشتری داشت.
 *
 * ولی *فرمش* همان فرم ارسال فروش است، تا انباردار یک رفتار را یاد
 * بگیرد نه دو تا.
 */
function SupplierReturnShipmentForm({ purchaseReturn }) {
  const navigate = useNavigate();
  const confirmMutation = useConfirmSupplierReturnShipmentMutation();

  const initializeFromReturn = useShippingFormStore(
    (s) => s.initializeFromReturn,
  );

  const returnLines = useMemo(
    () =>
      buildGoodsLines(purchaseReturn, EFFECT_KINDS.GOODS_OUT).filter(
        (line) => line.remainingQty > 0,
      ),
    [purchaseReturn],
  );

  useEffect(() => {
    initializeFromReturn(purchaseReturn, returnLines, {
      partyName: purchaseReturn.supplierName,
    });
  }, [purchaseReturn, returnLines, initializeFromReturn]);

  const {
    formData,
    setFormData,
    handleItemChange,
    isAllComplete,
    buildPayload,
    resetForm,
  } = useShippingForm(null);

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

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => () => resetForm(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const isBusy = confirmMutation.isPending;
  const hasSomethingToSend = items.some(
    (item) => (Number(item.shippedQty) || 0) > 0,
  );

  const handleConfirmClick = () => {
    if (!hasSomethingToSend) return;
    setShowConfirmDialog(true);
  };

  const handleSubmit = () => {
    const willStayPending = !isAllComplete;
    confirmMutation.mutate(
      { returnId: purchaseReturn.id, shipmentData: buildPayload() },
      {
        onSuccess: () => {
          setShowConfirmDialog(false);
          resetForm();
          if (willStayPending) {
            toast.success(
              "این دور ثبت شد. باقیمانده هر وقت فرستاده شد، دوباره از همین صفحه ثبت کنید.",
            );
          }
          navigate(ROUTES.WAREHOUSE_SHIPPING);
        },
      },
    );
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CheckCircle className="h-12 w-12 text-[oklch(0.50_0.16_152)]" />
        <p className="text-lg text-muted-foreground">
          همه‌ی کالاهای این مرجوعی قبلاً به تامین‌کننده عودت داده شده‌اند.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate(ROUTES.WAREHOUSE_SHIPPING)}
        >
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ShippingItemsSection
            items={displayItems}
            title="اقلام عودتی به تامین‌کننده"
            subtitle={`مرجوعی ${purchaseReturn.returnNumber} · فاکتور خرید ${purchaseReturn.purchaseInvoiceNumber}`}
            onItemChange={handleItemChange}
          />

          <ShippingTransporterSection
            formData={formData}
            onFormChange={setFormData}
          />
        </div>

        <div className="space-y-4">
          <ReturnSummaryCard
            side={PURCHASE_SIDE}
            formData={formData}
            onFormChange={setFormData}
            partyName={formData.customerName}
            title="اطلاعات عودت"
            progressLabel="پیشرفت عودت"
            progressField="shippedQty"
            dateField="shippedDate"
            dateLabel="تاریخ عودت"
            noteField="shippingNote"
            noteLabel="یادداشت عودت"
          />

          <div className="flex gap-2">
            <Button
              className={`flex-1 gap-2 ${
                !isAllComplete ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
              }`}
              disabled={isBusy || !hasSomethingToSend}
              onClick={handleConfirmClick}
            >
              {isAllComplete ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {isAllComplete ? "تأیید عودت کامل" : "ثبت این دور از عودت"}
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
            باقیمانده برای دور بعدی نگه داشته می‌شود و دوباره در همین صفحه ظاهر
            می‌شود.
          </p>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAllComplete ? "ثبت عودت کامل" : "ثبت این دور از عودت"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAllComplete
                ? "آیا مطمئن هستید که همه‌ی کالاهای باقی‌مانده به تامین‌کننده عودت داده شده‌اند؟"
                : "فقط مقادیری که وارد کرده‌اید ثبت می‌شود؛ بقیه برای دور بعدی می‌ماند."}
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

export default function SupplierReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const {
    data: purchaseReturn,
    isLoading,
    isError,
  } = usePurchaseReturnQuery(Number(id));

  useEffect(() => {
    setHeader({
      title: isLoading ? "در حال بارگذاری..." : "عودت کالا به تامین‌کننده",
      showBack: true,
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, isLoading]);

  if (isLoading) return <WarehouseFormSkeleton />;

  if (isError || !purchaseReturn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">مرجوعی مورد نظر یافت نشد.</p>
        <Button
          variant="outline"
          onClick={() => navigate(ROUTES.WAREHOUSE_SHIPPING)}
        >
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return (
    <SupplierReturnShipmentForm
      key={`${purchaseReturn.id}:${purchaseReturn.updatedAt}`}
      purchaseReturn={purchaseReturn}
    />
  );
}
