import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Trash2, Link2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { useHeaderStore } from "@/shared/store/headerStore";

import { useSalesReturnQuery } from "../services/queries";
import {
  useAddClaimResolutionMutation,
  useRemoveClaimResolutionMutation,
  useRejectSalesReturnMutation,
  useCancelSalesReturnMutation,
  useReopenSalesReturnMutation,
  useRemoveSalesReturnMutation,
} from "../services/mutations";
import {
  canDeleteSalesReturn,
  summarizeReturn,
} from "../domain/returnResolutions";

import SalesReturnDetailLoading from "../components/forms/SalesReturnDetailLoading";
import SalesReturnResolutionSection from "../components/forms/SalesReturnResolutionSection";
import { ROUTES } from "@/shared/constants/routes";
import { gregorianToPersian } from "@/shared/utils/dateUtils";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";

function SalesReturnDetailContent({ salesReturn }) {
  const addResolutionMutation = useAddClaimResolutionMutation(salesReturn.id);
  const removeResolutionMutation = useRemoveClaimResolutionMutation(
    salesReturn.id,
  );
  const rejectMutation = useRejectSalesReturnMutation(salesReturn.id);
  const cancelMutation = useCancelSalesReturnMutation(salesReturn.id);
  const reopenMutation = useReopenSalesReturnMutation(salesReturn.id);
  const removeMutation = useRemoveSalesReturnMutation();

  const isBusy =
    addResolutionMutation.isPending ||
    removeResolutionMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    reopenMutation.isPending ||
    removeMutation.isPending;

  const money = summarizeReturn(salesReturn);

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {salesReturn.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  توضیحات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {salesReturn.description}
                </p>
              </CardContent>
            </Card>
          )}

          <SalesReturnResolutionSection
            salesReturn={salesReturn}
            isBusy={isBusy}
            onAddResolution={(claimId, draft) =>
              addResolutionMutation.mutate({ claimId, draft })
            }
            onRemoveResolution={(claimId, resolutionId) =>
              removeResolutionMutation.mutate({ claimId, resolutionId })
            }
            onReject={() => rejectMutation.mutate()}
            onCancel={() => cancelMutation.mutate()}
            onReopen={() => reopenMutation.mutate()}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                اطلاعات مرجوعی
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">شماره مرجوعی</span>
                <span className="font-mono font-medium">
                  {salesReturn.returnNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">فاکتور فروش</span>
                <span className="font-mono font-medium">
                  {salesReturn.saleInvoiceNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">مشتری</span>
                <span className="font-medium">{salesReturn.customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">تاریخ درخواست</span>
                <span className="font-medium">
                  {gregorianToPersian(salesReturn.returnDate)}
                </span>
              </div>
              {salesReturn.previousReturnId && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">مرجوعی قبلی</span>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Link2 className="h-3 w-3" />
                    #{salesReturn.previousReturnId}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">جمع مبلغ ادعا</span>
                <span className="font-bold">
                  {salesReturn.totalClaimedAmount.toLocaleString("fa-IR")} ریال
                </span>
              </div>
              {money.moneyOut > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    پرداختی به مشتری
                  </span>
                  <span className="font-medium text-destructive">
                    {money.moneyOut.toLocaleString("fa-IR")} ریال
                  </span>
                </div>
              )}
              {money.moneyIn > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    دریافتی از مشتری
                  </span>
                  <span className="font-medium text-[oklch(0.50_0.16_152)]">
                    {money.moneyIn.toLocaleString("fa-IR")} ریال
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {canDeleteSalesReturn(salesReturn) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                  disabled={isBusy}
                >
                  <Trash2 className="h-4 w-4" />
                  حذف کامل این مرجوعی
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف مرجوعی</AlertDialogTitle>
                  <AlertDialogDescription>
                    این عملیات قابل بازگشت نیست. مرجوعی «
                    {salesReturn.returnNumber}» برای همیشه حذف خواهد شد.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>انصراف</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() => removeMutation.mutate(salesReturn.id)}
                  >
                    حذف شود
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const {
    data: salesReturn,
    isLoading,
    isError,
  } = useSalesReturnQuery(Number(id));

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : salesReturn
          ? "جزئیات مرجوعی"
          : "خطا",
      showBack: true,
      onBack: () => navigate(ROUTES.SALES_RETURNS_LIST),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, salesReturn, isLoading]);

  if (isLoading) return <SalesReturnDetailLoading />;

  if (isError || !salesReturn) {
    return (
      <DetailErrorState
        message="مرجوعی مورد نظر یافت نشد."
        onBack={() => navigate(ROUTES.SALES_RETURNS_LIST)}
      />
    );
  }

  return (
    <SalesReturnDetailContent key={salesReturn.id} salesReturn={salesReturn} />
  );
}
