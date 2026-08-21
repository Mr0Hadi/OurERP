import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, AlertTriangle, X } from "lucide-react";
import { toast } from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useHeaderStore } from "@/shared/store/headerStore";
import { useSalesReturnQuery } from "@/features/sales/returns/services/queries";
import { useConfirmReturnIntakeMutation } from "../services/mutations";
import { useReturnInspectionForm } from "../hooks/useReturnInspectionForm";

import ReceivingReturnItemsSection from "../components/forms/ReceivingReturnItemsSection";
import ReturnSummaryCard from "../components/forms/ReturnSummaryCard";
import ReturnTransporterSection from "../components/forms/ReturnTransporterSection";
import ReturnDetailLoading from "../components/forms/ReturnDetailLoading";
import { ROUTES } from "@/shared/constants/routes";

function ReceivingReturnDetailForm({ salesReturn }) {
  const navigate = useNavigate();
  const intakeMutation = useConfirmReturnIntakeMutation();

  const {
    formData, setFormData, lines, handleLineChange,
    isAllComplete, isTransporterValid, hasSomethingToRecord, buildPayload, resetForm,
  } = useReturnInspectionForm(salesReturn);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showTransporterError, setShowTransporterError] = useState(false);

  useEffect(() => () => resetForm(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const isBusy = intakeMutation.isPending;

  const handleConfirmClick = () => {
    if (!hasSomethingToRecord) return;
    if (!isTransporterValid) { setShowTransporterError(true); return; }
    setShowTransporterError(false);
    setShowConfirmDialog(true);
  };

  const handleSubmit = () => {
    const payload = buildPayload();
    const willStayPending = !isAllComplete;

    intakeMutation.mutate(
      { returnId: formData.returnId, intakeData: payload },
      {
        onSuccess: () => {
          setShowConfirmDialog(false);
          resetForm();
          if (willStayPending) {
            toast.success("این دور ثبت شد. باقیمانده هر وقت رسید، دوباره از همین صفحه ثبت کنید.");
          }
          navigate(ROUTES.WAREHOUSE_RECEIVING);
        },
      },
    );
  };

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CheckCircle className="h-12 w-12 text-[oklch(0.50_0.16_152)]" />
        <p className="text-lg text-muted-foreground">
          برای این مرجوعی کالایی در انتظار تحویل نیست.
        </p>
        <Button variant="outline" onClick={() => navigate(ROUTES.WAREHOUSE_RECEIVING)}>بازگشت به لیست</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ReceivingReturnItemsSection lines={lines} onLineChange={handleLineChange} />
          <ReturnTransporterSection
            formData={formData}
            onFormChange={(patch) => { setFormData(patch); if (showTransporterError) setShowTransporterError(false); }}
            error={showTransporterError ? "برای ثبت دریافت، نام تحویل‌دهنده و حداقل یکی از کد ملی یا شماره پلاک الزامی است" : null}
          />
        </div>

        <div className="space-y-4">
          <ReturnSummaryCard formData={formData} onFormChange={setFormData} />

          <div className="flex gap-2">
            <Button
              className={`flex-1 gap-2 ${!isAllComplete ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
              disabled={isBusy || !hasSomethingToRecord}
              onClick={handleConfirmClick}
            >
              {isAllComplete ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {isAllComplete ? "تأیید دریافت کامل" : "ثبت این دور (باقیمانده هنوز نرسیده)"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.WAREHOUSE_RECEIVING)} disabled={isBusy} className="gap-2">
              <X className="h-4 w-4" />انصراف
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center px-2">
            این صفحه چند بار قابل استفاده است — هر بار که بخشی از مرجوعی رسید، همین‌جا ثبتش کنید؛ فرم فقط اقلامی که
            هنوز کامل نرسیده‌اند را نشان می‌دهد.
          </p>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAllComplete ? "ثبت دریافت کامل مرجوعی" : "ثبت این دور از دریافت"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAllComplete
                ? "آیا مطمئن هستید که همه‌ی اقلام باقی‌مانده در این دور به‌طور کامل رسیده‌اند؟"
                : "بخشی که در این دور وارد نکرده‌اید، برای دور بعدی نگه داشته می‌شود و می‌توانید هر وقت رسید دوباره به این صفحه برگردید."}
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

export default function ReceivingReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: salesReturn, isLoading, isError } = useSalesReturnQuery(Number(id));

  useEffect(() => {
    setHeader({
      title: isLoading ? "در حال بارگذاری..." : salesReturn ? "بررسی و دریافت مرجوعی" : "خطا",
      showBack: true,
      onBack: () => navigate(ROUTES.WAREHOUSE_RECEIVING),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, salesReturn, isLoading]);

  if (isLoading) return <ReturnDetailLoading />;

  if (isError || !salesReturn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">مرجوعی مورد نظر یافت نشد.</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.WAREHOUSE_RECEIVING)}>بازگشت به لیست</Button>
      </div>
    );
  }

  return <ReceivingReturnDetailForm key={`${salesReturn.id}:${salesReturn.updatedAt}`} salesReturn={salesReturn} />;
}