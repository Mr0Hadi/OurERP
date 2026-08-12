// src/features/purchases/pages/PurchaseReturnDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Trash2,
  ClipboardList,
  Undo2,
  Store,
  FileText,
  Tag,
  Wallet,
  Clock,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Ban,
} from "lucide-react";

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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { useHeaderStore } from "@/shared/store/headerStore";
import { usePurchaseReturnQuery } from "../services/returns/queries";
import {
  useAddReturnItemResolutionMutation,
  useRemoveReturnItemResolutionMutation,
  useRejectPurchaseReturnMutation,
  useCancelPurchaseReturnMutation,
  useReopenPurchaseReturnMutation,
  useRemovePurchaseReturnMutation,
} from "../services/returns/mutations";
import PurchaseReturnResolutionSection from "../components/forms/PurchaseReturnResolutionSection";
import PurchaseReturnDetailLoading from "../components/forms/PurchaseReturnDetailLoading";
import {
  PURCHASE_RETURN_REASON_LABELS,
  PURCHASE_RETURN_STATUSES,
  PURCHASE_RETURN_STATUS_LABELS,
  RESOLUTION_TYPES,
  RESOLUTION_LINE_STATUSES,
} from "../services/returns/mockData";
import { canDeletePurchaseReturn } from "../domain/purchaseReturnRules";
import { gregorianToPersian } from "@/shared/utils/dateUtils";
import { ROUTES } from "@/shared/constants/routes";

// ─── وضعیت مرجوعی (برای بج بالای صفحه) ──────────────────────────────────────
const STATUS_CONFIG = {
  [PURCHASE_RETURN_STATUSES.PENDING]: {
    icon: Clock,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  },
  [PURCHASE_RETURN_STATUSES.COORDINATING]: {
    icon: MessageCircle,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400",
  },
  [PURCHASE_RETURN_STATUSES.RESOLVED]: {
    icon: CheckCircle2,
    className:
      "bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800",
  },
  [PURCHASE_RETURN_STATUSES.REJECTED]: {
    icon: XCircle,
    className: "bg-destructive/5 text-destructive border-destructive/20",
  },
  [PURCHASE_RETURN_STATUSES.CANCELLED]: {
    icon: Ban,
    className: "bg-muted text-muted-foreground border-border",
  },
};

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

  const statusConfig =
    STATUS_CONFIG[purchaseReturn.status] ??
    STATUS_CONFIG[PURCHASE_RETURN_STATUSES.PENDING];
  const StatusIcon = statusConfig.icon;

  // ─── خلاصه مالی ────────────────────────────────────────────────────────
  const allLines = purchaseReturn.items.flatMap((i) => i.resolutions || []);
  const resolvedLines = allLines.filter(
    (l) => l.status === RESOLUTION_LINE_STATUSES.RESOLVED,
  );
  const refundedAmount = resolvedLines
    .filter((l) => l.type === RESOLUTION_TYPES.REFUND)
    .reduce((s, l) => s + (Number(l.refundAmount) || 0), 0);
  const writeOffAmount = resolvedLines
    .filter((l) => l.type === RESOLUTION_TYPES.WRITE_OFF)
    .reduce((s, l) => s + Number(l.qty || 0), 0);
  const allocatedQty = allLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const totalQty = purchaseReturn.items.reduce((s, i) => s + i.qty, 0);
  const pendingQty = Math.max(0, totalQty - allocatedQty);

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ─── ستون بزرگ (راست): اقلام گزارش‌شده + پیگیری و هماهنگی ─── */}
        <div className="lg:col-span-2 space-y-4">
          {/* اقلام گزارش‌شده */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                اقلام گزارش‌شده
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                این اطلاعات از گزارش انبار در لحظه‌ی ثبت این مرجوعی گرفته شده.
                تصمیم‌گیری و تسویه‌ی هر قلم در بخش «پیگیری و هماهنگی» انجام
                می‌شود.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* نسخه دسکتاپ: جدول */}
              <div className="hidden md:block border border-border rounded-lg overflow-hidden">
                <table className="w-full table-fixed text-sm">
                  <thead className="bg-muted text-muted-foreground text-xs">
                    <tr>
                      <th className="w-[34%] text-right px-3 py-2.5 font-medium">
                        کالا
                      </th>
                      <th className="w-[12%] text-center px-2 py-2.5 font-medium">
                        تعداد
                      </th>
                      <th className="w-[16%] text-center px-2 py-2.5 font-medium">
                        قیمت واحد
                      </th>
                      <th className="w-[22%] text-center px-2 py-2.5 font-medium">
                        نوع مشکل گزارش‌شده
                      </th>
                      <th className="w-[16%] text-center px-2 py-2.5 font-medium">
                        جمع
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchaseReturn.items.map((item) => (
                      <tr
                        key={item.issueId}
                        className="hover:bg-accent/30 transition-colors"
                      >
                        <td className="px-3 py-2 truncate">
                          <p className="font-medium text-card-foreground text-sm truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.productCode}
                          </p>
                          {item.note && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {item.note}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">
                          {item.qty.toLocaleString("fa-IR")}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">
                          {item.unitPrice.toLocaleString("fa-IR")}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Badge
                            variant="outline"
                            className="text-[11px] whitespace-normal w-full h-full"
                          >
                            {PURCHASE_RETURN_REASON_LABELS[item.reason] ??
                              item.reason}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums font-medium text-card-foreground">
                          {item.lineTotal.toLocaleString("fa-IR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted border-t border-border">
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-2.5 text-sm font-medium text-muted-foreground text-right"
                      >
                        جمع کل:
                      </td>
                      <td className="px-2 py-2.5 text-center text-sm font-bold text-card-foreground">
                        {purchaseReturn.totalAmount.toLocaleString("fa-IR")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* نسخه موبایل: کارت */}
              <div className="md:hidden space-y-2">
                {purchaseReturn.items.map((item) => (
                  <div
                    key={item.issueId}
                    className="border border-border rounded-lg p-3 space-y-2 bg-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-card-foreground text-sm truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.productCode}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[11px] shrink-0">
                        {PURCHASE_RETURN_REASON_LABELS[item.reason] ??
                          item.reason}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
                      <span>
                        تعداد: {item.qty.toLocaleString("fa-IR")} ×{" "}
                        {item.unitPrice.toLocaleString("fa-IR")}
                      </span>
                      <span className="font-bold text-card-foreground">
                        {item.lineTotal.toLocaleString("fa-IR")}
                      </span>
                    </div>
                    {item.note && (
                      <p className="text-xs text-muted-foreground">
                        {item.note}
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 border border-border">
                  <span className="text-sm font-medium text-muted-foreground">
                    جمع کل:
                  </span>
                  <span className="text-sm font-bold text-card-foreground">
                    {purchaseReturn.totalAmount.toLocaleString("fa-IR")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
                <Undo2 className="h-4 w-4 text-muted-foreground" />
                مرجوعی {purchaseReturn.returnNumber ?? `#${purchaseReturn.id}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`gap-1.5 ${statusConfig.className}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {PURCHASE_RETURN_STATUS_LABELS[purchaseReturn.status] ??
                    purchaseReturn.status}
                </Badge>
                <Badge variant="outline">
                  {gregorianToPersian(purchaseReturn.returnDate)}
                </Badge>
              </div>

              <div className="flex items-start gap-2">
                <Store className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">تامین‌کننده</p>
                  <p className="font-medium text-card-foreground">
                    {purchaseReturn.supplierName}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    فاکتور خرید مبدا
                  </p>
                  <p className="font-medium text-card-foreground">
                    {purchaseReturn.purchaseInvoiceNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">دلیل غالب</p>
                  <p className="font-medium text-card-foreground">
                    {PURCHASE_RETURN_REASON_LABELS[purchaseReturn.reason] ??
                      purchaseReturn.reason}
                  </p>
                </div>
              </div>
              {purchaseReturn.description && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-1">توضیحات</p>
                  <p className="text-card-foreground">
                    {purchaseReturn.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* خلاصه مالی */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                خلاصه مالی مرجوعی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">جمع کل مرجوعی</span>
                  <span className="font-medium text-card-foreground">
                    {purchaseReturn.totalAmount.toLocaleString("fa-IR")} ریال
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    بازگشت وجه نهایی‌شده
                  </span>
                  <span className="font-medium text-[oklch(0.50_0.16_152)]">
                    {refundedAmount.toLocaleString("fa-IR")} ریال
                  </span>
                </div>
                {writeOffAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      زیان پذیرفته‌شده
                    </span>
                    <span className="font-medium text-muted-foreground">
                      {writeOffAmount.toLocaleString("fa-IR")} عدد
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-border pt-2">
                  <span className="text-muted-foreground">
                    مانده در انتظار تصمیم
                  </span>
                  <span
                    className={`font-semibold ${
                      pendingQty > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-[oklch(0.50_0.16_152)]"
                    }`}
                  >
                    {pendingQty.toLocaleString("fa-IR")} عدد
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

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
