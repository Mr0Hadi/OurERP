import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, Trash2 } from "lucide-react";

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
import { usePurchaseReturnQuery } from "../services/queries";
import {
  useAddReturnItemResolutionMutation,
  useRemoveReturnItemResolutionMutation,
  useRejectPurchaseReturnMutation,
  useCancelPurchaseReturnMutation,
  useReopenPurchaseReturnMutation,
  useRemovePurchaseReturnMutation,
} from "../services/mutations";
import PurchaseReturnResolutionSection from "../components/forms/PurchaseReturnResolutionSection";
import PurchaseReturnDetailLoading from "../components/forms/PurchaseReturnDetailLoading";
import ReportedItemsTable from "../components/forms/ReportedItemsTable";
import ReturnInfoSidebar from "../components/forms/ReturnInfoSidebar";
import { canDeletePurchaseReturn } from "../domain/purchaseReturnRules";
import { ROUTES } from "@/shared/constants/routes";

function PurchaseReturnDetailForm({ purchaseReturn }) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const addResolutionMutation = useAddReturnItemResolutionMutation(
    purchaseReturn.id,
  );
  const removeResolutionMutation = useRemoveReturnItemResolutionMutation(
    purchaseReturn.id,
  );
  const rejectMutation = useRejectPurchaseReturnMutation(purchaseReturn.id);
  const cancelMutation = useCancelPurchaseReturnMutation(purchaseReturn.id);
  const reopenMutation = useReopenPurchaseReturnMutation(purchaseReturn.id);
  const deleteMutation = useRemovePurchaseReturnMutation();

  const isBusy =
    addResolutionMutation.isPending ||
    removeResolutionMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    reopenMutation.isPending ||
    deleteMutation.isPending;

  const handleAddResolution = (issueId, resolution) =>
    addResolutionMutation.mutate({ issueId, resolution });
  const handleRemoveResolution = (issueId, resolutionId) =>
    removeResolutionMutation.mutate({ issueId, resolutionId });
  const handleDelete = () => deleteMutation.mutate(purchaseReturn.id);
  const canDelete = canDeletePurchaseReturn(purchaseReturn);

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ─── ستون بزرگ (راست): اقلام گزارش‌شده + پیگیری و هماهنگی ─── */}
        <div className="lg:col-span-2 space-y-4">
          {/* اقلام گزارش‌شده */}
          <ReportedItemsTable purchaseReturn={purchaseReturn} />

          {/* پیگیری و هماهنگی با تامین‌کننده */}
          <PurchaseReturnResolutionSection
            purchaseReturn={purchaseReturn}
            onAddResolution={handleAddResolution}
            onRemoveResolution={handleRemoveResolution}
            onReject={() => rejectMutation.mutate()}
            onCancel={() => cancelMutation.mutate()}
            onReopen={() => reopenMutation.mutate()}
            isBusy={isBusy}
          />
        </div>

        {/* ─── ستون باریک (چپ): اطلاعات مرجوعی + خلاصه مالی + اکشن‌ها ─── */}
        <div className="space-y-4">
          <ReturnInfoSidebar purchaseReturn={purchaseReturn} />

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.PURCHASES_RETURNS_LIST)}
            disabled={isBusy}
            className="w-full"
          >
            بازگشت به لیست مرجوعی‌ها
          </Button>

          {canDelete ? (
            <Button
              type="button"
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isBusy}
            >
              <Trash2 className="h-4 w-4" />
              حذف مرجوعی
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground text-center px-2">
              این مرجوعی حداقل یک تصمیم ثبت‌شده دارد و دیگر قابل حذف نیست.
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مرجوعی</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این مرجوعی اطمینان دارید؟ این عملیات قابل بازگشت نیست.
              پس از حذف، این کسری دوباره با وضعیت «قابل پیگیری» در لیست ظاهر
              می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "در حال حذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PurchaseReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const {
    data: purchaseReturn,
    isLoading,
    isError,
  } = usePurchaseReturnQuery(id);

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : purchaseReturn
          ? "جزئیات مرجوعی"
          : "خطا",
      showBack: true,
      onBack: () => navigate(ROUTES.PURCHASES_RETURNS_LIST),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, purchaseReturn, isLoading]);

  if (isLoading) return <PurchaseReturnDetailLoading />;

  if (isError || !purchaseReturn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          مرجوعی مورد نظر یافت نشد.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate(ROUTES.PURCHASES_RETURNS_LIST)}
        >
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return (
    <PurchaseReturnDetailForm
      key={purchaseReturn.id}
      purchaseReturn={purchaseReturn}
    />
  );
}
