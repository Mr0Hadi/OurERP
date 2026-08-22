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
import { useShippingSaleQuery } from "../services/queries";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { useConfirmShipmentMutation } from "../services/mutations";
import { useShippingForm } from "../hooks/useShippingForm";
import ShippingItemsSection from "../components/forms/ShippingItemsSection";
import {
  SHIPPING_SOURCES,
  SHIPPING_SOURCE_LABELS,
} from "../domain/shippingVocabulary";
import ShippingSummaryCard from "../components/forms/ShippingSummaryCard";
import ShippingTransporterSection from "../components/forms/ShippingTransporterSection";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { ROUTES } from "@/shared/constants/routes";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

function ShippingDetailForm({ sale }) {
  const navigate = useNavigate();
  const shipMutation = useConfirmShipmentMutation();

  const { data: productsData } = useProductsQuery(ALL_FILTERS, PAGINATION, SORTING);
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
    isDriverValid,
    buildPayload,
    resetForm,
  } = useShippingForm(sale);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDriverError, setShowDriverError] = useState(false);

  useEffect(() => {
    return () => resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = formData.items || [];

  const displayItems = useMemo(
    () =>
      items.map((item) => {
        const product = productMap.get(item.productId);
        return { ...item, image: product?.image || "" };
      }),
    [items, productMap],
  );

  const orderItems = displayItems.filter(
    (item) => (item.source ?? SHIPPING_SOURCES.ORDER) === SHIPPING_SOURCES.ORDER,
  );
  const returnItems = displayItems.filter(
    (item) => item.source === SHIPPING_SOURCES.RETURN,
  );

  const isBusy = shipMutation.isPending;

  const handleConfirmClick = () => {
    if (!isDriverValid) {
      setShowDriverError(true);
      return;
    }
    setShowDriverError(false);
    setShowConfirmDialog(true);
  };

  const handleSubmit = () => {
    const payload = buildPayload();

    shipMutation.mutate(
      { saleId: payload.id, shipmentData: payload },
      {
        onSuccess: () => {
          setShowConfirmDialog(false);
          resetForm();
          navigate(ROUTES.WAREHOUSE_SHIPPING);
        },
      },
    );
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ShippingItemsSection
            items={orderItems}
            title={
              returnItems.length > 0
                ? SHIPPING_SOURCE_LABELS[SHIPPING_SOURCES.ORDER]
                : "اقلام ارسال"
            }
            onItemChange={handleItemChange}
          />

          {returnItems.length > 0 && (
            <ShippingItemsSection
              items={returnItems}
              title={SHIPPING_SOURCE_LABELS[SHIPPING_SOURCES.RETURN]}
              subtitle="کالای جایگزینی که بابت مرجوعی‌های همین فروش به مشتری بدهکاریم و با همین ماشین می‌رود."
              onItemChange={handleItemChange}
            />
          )}
          <ShippingTransporterSection
            formData={formData}
            onFormChange={(patch) => {
              setFormData(patch);
              if (showDriverError) setShowDriverError(false);
            }}
            error={
              showDriverError
                ? "برای ثبت ارسال، نام راننده و حداقل یکی از کد ملی یا شماره پلاک الزامی است"
                : null
            }
          />
        </div>

        <div className="space-y-4">
          <ShippingSummaryCard formData={formData} onFormChange={setFormData} />

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
              {isAllComplete ? "تأیید ارسال کامل" : "ثبت ارسال (ناقص)"}
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

          {items.every((i) => !(i.shippedQty > 0)) && (
            <p className="text-xs text-muted-foreground text-center px-2">
              این فروش هنوز هیچ ارسالی ندارد. باقیمانده‌ای که این دور ارسال
              نکنید، برای دور بعدی در همین لیست باقی می‌ماند.
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAllComplete ? "ثبت ارسال کامل" : "ثبت ارسال ناقص"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAllComplete
                ? "آیا مطمئن هستید که همه اقلام به‌طور کامل آماده و ارسال شده‌اند؟"
                : "بخشی که ارسال نکرده‌اید در انتظار محموله بعدی می‌ماند و این فروش همچنان در لیست ارسال باقی می‌ماند."}
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

export default function ShippingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: sale, isLoading, isError } = useShippingSaleQuery(Number(id));

  useEffect(() => {
    setHeader({
      title: isLoading ? "در حال بارگذاری..." : sale ? "ارسال کالا" : "خطا",
      showBack: true,
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, sale, isLoading]);

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

  return <ShippingDetailForm key={sale.id} sale={sale} />;
}
