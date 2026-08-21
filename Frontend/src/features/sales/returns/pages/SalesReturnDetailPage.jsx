import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Link2, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
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

import { useSalesReturnQuery, useSaleForReturnQuery } from "../services/queries";
import {
  useAddClaimResolutionMutation,
  useRemoveClaimResolutionMutation,
  useRejectSalesReturnMutation,
  useCancelSalesReturnMutation,
  useReopenSalesReturnMutation,
  useRemoveSalesReturnMutation,
} from "../services/mutations";
import { canDeleteSalesReturn } from "../domain/returnResolutions";

import SalesReturnDetailLoading from "../components/forms/SalesReturnDetailLoading";
import SalesReturnStatusBar from "../components/forms/SalesReturnStatusBar";
import SaleInvoiceCard from "../components/forms/SaleInvoiceCard";
import SalesReturnResolutionSection from "../components/forms/SalesReturnResolutionSection";
import { ROUTES } from "@/shared/constants/routes";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";

/**
 * جزئیات یک مرجوعی — یک ستون، به ترتیبِ کاری که کاربر انجام می‌دهد:
 * خلاصه‌ی وضعیت، فاکتورِ مرجع (بسته)، و بعد ادعاها و تصمیم‌ها.
 *
 * چیدمان قبلی دو ستونه بود و روی موبایل سایدبار به ته صفحه می‌افتاد،
 * پس خلاصه‌ی مالی عملاً دیده نمی‌شد. حالا آن اطلاعات در نوار بالا و
 * کنارِ وضعیت است و ستون دوم اصلاً لازم نیست.
 */
function SalesReturnDetailContent({ salesReturn }) {
  // مرجوعیِ خودش از سقف مستثنا می‌شود تا کارت فاکتور، «ادعاشده در
  // مرجوعی دیگر» را درست نشان دهد — نه ادعاهای همین سند را دوباره
  // به‌عنوان «مرجوعیِ دیگر» بشمارد.
  const { data: sale } = useSaleForReturnQuery(
    salesReturn.saleId,
    salesReturn.id,
  );

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

  return (
    <div className="container max-w-3xl mx-auto px-4 space-y-3 animate-in fade-in zoom-in-95 duration-300">
      <SalesReturnStatusBar salesReturn={salesReturn} />

      {salesReturn.previousReturnId && (
        <Badge variant="outline" className="text-xs gap-1">
          <Link2 className="h-3 w-3" />
          ادامه‌ی مرجوعی #{salesReturn.previousReturnId}
        </Badge>
      )}

      {sale && <SaleInvoiceCard sale={sale} defaultOpen={false} />}

      {salesReturn.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-line rounded-lg border border-border bg-muted/40 p-3">
          {salesReturn.description}
        </p>
      )}

      <SalesReturnResolutionSection
        salesReturn={salesReturn}
        isBusy={isBusy}
        onAddResolution={(claimId, composition) =>
          addResolutionMutation.mutate({ claimId, composition })
        }
        onRemoveResolution={(claimId, resolutionId) =>
          removeResolutionMutation.mutate({ claimId, resolutionId })
        }
        onReject={() => rejectMutation.mutate()}
        onCancel={() => cancelMutation.mutate()}
        onReopen={() => reopenMutation.mutate()}
      />

      {canDeleteSalesReturn(salesReturn) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-destructive hover:bg-destructive/10"
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
                این عملیات قابل بازگشت نیست. مرجوعی «{salesReturn.returnNumber}»
                برای همیشه حذف خواهد شد.
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
