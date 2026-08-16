import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, AlertTriangle, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import ShippingItemsSection from "./ShippingItemsSection";
import ShippingTransporterSection from "./ShippingTransporterSection";
import { ROUTES } from "@/shared/constants/routes";

/**
 * صفحه‌ی «آماده‌سازی و ثبت یک محموله‌ی خروجی» — مشترک بین ارسال کالای
 * جایگزین (به مشتری) و عودت مازاد (به تامین‌کننده).
 *
 * هر دو دقیقاً یک کار می‌کنند: چند خط تصمیمِ در انتظار را از یک مرجوعی
 * برمی‌دارند، انباردار برای هرکدام تعدادِ همین دور را وارد می‌کند،
 * اطلاعات راننده گرفته می‌شود و مقدارِ ارسالی به‌صورت تجمعی ثبت
 * می‌شود. تفاوتشان فقط در متن‌ها، منبع داده و mutation است — پس آن‌ها
 * از بیرون داده می‌شوند و بدنه یکی می‌ماند.
 *
 * form  - خروجی هوکی هم‌شکل با useReplacementShipmentForm
 * texts - تمام رشته‌های وابسته به نوع محموله
 * infoRows - ردیف‌های خلاصه‌ی بالای ستون کناری ([{label, value}])
 */
export default function OutboundShipmentForm({
  form,
  texts,
  infoRows,
  pendingCount,
  resetKey,
  onConfirm,
  isBusy,
}) {
  const navigate = useNavigate();
  const {
    items,
    transportInfo,
    handleItemChange,
    setTransportField,
    isAllComplete,
    hasAnyToShip,
    isTransporterValid,
    reset,
  } = form;

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDriverError, setShowDriverError] = useState(false);

  useEffect(() => () => reset(), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CheckCircle className="h-12 w-12 text-[oklch(0.50_0.16_152)]" />
        <p className="text-lg text-muted-foreground">{texts.emptyMessage}</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.WAREHOUSE_SHIPPING)}>
          بازگشت به لیست
        </Button>
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
    onConfirm({
      onSuccess: () => {
        setShowConfirmDialog(false);
        reset();
        navigate(ROUTES.WAREHOUSE_SHIPPING);
      },
    });
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ShippingItemsSection items={items} onItemChange={handleItemChange} />
          <ShippingTransporterSection
            formData={{ ...transportInfo, saleId: resetKey }}
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
              <CardTitle className="text-base font-semibold">{texts.infoTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium">{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">تعداد اقلام در انتظار</span>
                <span className="font-medium tabular-nums">
                  {pendingCount.toLocaleString("fa-IR")}
                </span>
              </div>

              <div className="space-y-1.5 border-t border-border pt-3">
                <Label className="text-sm font-medium">تاریخ ارسال</Label>
                <PersianDatePicker
                  value={transportInfo.shippedDate}
                  onChange={(v) => setTransportField({ shippedDate: v })}
                />
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
              {isAllComplete ? texts.confirmFullLabel : texts.confirmPartialLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.WAREHOUSE_SHIPPING)}
              disabled={isBusy}
              className="gap-2"
            >
              <X className="h-4 w-4" />انصراف
            </Button>
          </div>

          {!isAllComplete && (
            <p className="text-xs text-muted-foreground text-center px-2">
              {texts.partialHint}
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAllComplete ? texts.dialogFullTitle : texts.dialogPartialTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAllComplete ? texts.dialogFullBody : texts.dialogPartialBody}
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
