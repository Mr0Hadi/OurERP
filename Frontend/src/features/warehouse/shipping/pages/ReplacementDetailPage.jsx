import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, AlertTriangle, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import { useHeaderStore } from "@/shared/store/headerStore";
import { useSalesReturnQuery } from "@/features/sales/returns/services/queries";
import ShippingItemsSection from "../components/forms/ShippingItemsSection";
import ShippingTransporterSection from "../components/forms/ShippingTransporterSection";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { useReplacementShipmentForm } from "../hooks/useReplacementShipmentForm";
import { useConfirmReplacementShipmentBatchMutation } from "../services/mutations";
import { ROUTES } from "@/shared/constants/routes";

function ShippingReplacementForm({ salesReturn }) {
  const navigate = useNavigate();
  const confirmMutation = useConfirmReplacementShipmentBatchMutation();

  const {
    items,
    transportInfo,
    handleItemChange,
    setTransportField,
    isAllComplete,
    hasAnyToShip,
    isTransporterValid,
    buildPayload,
    reset,
  } = useReplacementShipmentForm(salesReturn);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDriverError, setShowDriverError] = useState(false);

  useEffect(() => () => reset(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const isBusy = confirmMutation.isPending;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CheckCircle className="h-12 w-12 text-[oklch(0.50_0.16_152)]" />
        <p className="text-lg text-muted-foreground">همه‌ی کالاهای جایگزین این مرجوعی قبلاً ارسال شده‌اند.</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.WAREHOUSE_SHIPPING)}>بازگشت به لیست</Button>
      </div>
    );
  }

  const handleConfirmClick = () => {
    if (!hasAnyToShip) return;
    if (!isTransporterValid) { setShowDriverError(true); return; }
    setShowDriverError(false);
    setShowConfirmDialog(true);
  };

  const handleSubmit = () => {
    confirmMutation.mutate(
      { returnId: salesReturn.id, shipmentData: buildPayload() },
      { onSuccess: () => { setShowConfirmDialog(false); reset(); navigate(ROUTES.WAREHOUSE_SHIPPING); } },
    );
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ShippingItemsSection items={items} onItemChange={handleItemChange} />
          <ShippingTransporterSection
            formData={{ saleId: salesReturn.id, ...transportInfo }}
            onFormChange={(patch) => {
              setTransportField(patch);
              if (showDriverError) setShowDriverError(false);
            }}
            error={showDriverError ? "برای ثبت ارسال، نام راننده و حداقل یکی از کد ملی یا شماره پلاک الزامی است" : null}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">اطلاعات ارسال جایگزین</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">مشتری</span>
                <span className="font-medium">{salesReturn.customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">شماره مرجوعی</span>
                <span className="font-medium">{salesReturn.returnNumber}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">تعداد اقلام در انتظار</span>
                <span className="font-medium tabular-nums">{items.length.toLocaleString("fa-IR")}</span>
              </div>

              <div className="space-y-1.5 border-t border-border pt-3">
                <Label className="text-sm font-medium">تاریخ ارسال</Label>
                <PersianDatePicker value={transportInfo.shippedDate} onChange={(v) => setTransportField({ shippedDate: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">یادداشت ارسال</Label>
                <Textarea
                  rows={3}
                  value={transportInfo.shippingNote}
                  onChange={(e) => setTransportField({ shippingNote: e.target.value })}
                  className="resize-none text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              className={`flex-1 gap-2 ${!isAllComplete && hasAnyToShip ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
              disabled={isBusy || !hasAnyToShip}
              onClick={handleConfirmClick}
            >
              {isAllComplete ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {isAllComplete ? "تأیید ارسال کامل" : "ثبت ارسال (بخشی)"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.WAREHOUSE_SHIPPING)} disabled={isBusy} className="gap-2">
              <X className="h-4 w-4" />انصراف
            </Button>
          </div>

          {!isAllComplete && (
            <p className="text-xs text-muted-foreground text-center px-2">
              برای هر کالا مقداری که این دور ارسال می‌کنید را وارد کنید؛ باقیمانده‌ی هر کالا برای دور بعدی
              نگه داشته می‌شود و دوباره در این صفحه ظاهر می‌شود.
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAllComplete ? "ثبت ارسال کامل" : "ثبت ارسال بخشی"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAllComplete
                ? "آیا مطمئن هستید که همه‌ی کالاهای جایگزین باقی‌مانده ارسال شده‌اند؟"
                : "فقط مقادیری که برای هر کالا وارد کرده‌اید ثبت می‌شود؛ بقیه برای دور بعدی می‌ماند."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>انصراف</AlertDialogCancel>
            <AlertDialogAction disabled={isBusy} onClick={handleSubmit} className={!isAllComplete ? "bg-amber-600 hover:bg-amber-700" : ""}>
              {isBusy ? "در حال ثبت..." : "تأیید"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ReplacementDetailPage() {
  const { returnId } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: salesReturn, isLoading, isError } = useSalesReturnQuery(Number(returnId));

  useEffect(() => {
    setHeader({
      title: isLoading ? "در حال بارگذاری..." : "ارسال کالای جایگزین",
      showBack: true,
      onBack: () => navigate(ROUTES.WAREHOUSE_SHIPPING),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, isLoading]);

  if (isLoading)
    return (
      <WarehouseFormSkeleton
        itemActionSlot={false}
        summaryRows={2}
        hasSecondaryAction={false}
      />
    );

  if (isError || !salesReturn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">مرجوعی مورد نظر یافت نشد.</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.WAREHOUSE_SHIPPING)}>بازگشت به لیست</Button>
      </div>
    );
  }

  return <ShippingReplacementForm key={`${salesReturn.id}:${salesReturn.updatedAt}`} salesReturn={salesReturn} />;
}