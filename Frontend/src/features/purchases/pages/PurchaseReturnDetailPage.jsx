// src/features/purchases/pages/PurchaseReturnDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, Trash2, ClipboardList } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { useHeaderStore } from "@/shared/store/headerStore";
import { usePurchaseReturnQuery } from "../services/returns/queries";
import {
  useUpdatePurchaseReturnStatusMutation,
  useRemovePurchaseReturnMutation,
} from "../services/returns/mutations";
import PurchaseReturnResolutionSection from "../components/forms/PurchaseReturnResolutionSection";
import PurchaseReturnDetailLoading from "../components/forms/PurchaseReturnDetailLoading";
import { PURCHASE_RETURN_REASON_LABELS } from "../services/returns/mockData";
import { canDeletePurchaseReturn } from "../domain/purchaseReturnRules";
import { gregorianToPersian } from "@/shared/utils/dateUtils";
import { ROUTES } from "@/shared/constants/routes";

function PurchaseReturnDetailForm({ purchaseReturn }) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const statusMutation = useUpdatePurchaseReturnStatusMutation(purchaseReturn.id);
  const deleteMutation = useRemovePurchaseReturnMutation();
  const isBusy = statusMutation.isPending || deleteMutation.isPending;

  const handleUpdateStatus = (payload) => statusMutation.mutate(payload);
  const handleDelete = () => deleteMutation.mutate(purchaseReturn.id);
  const canDelete = canDeletePurchaseReturn(purchaseReturn);

  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold text-card-foreground">
                اطلاعات مرجوعی {purchaseReturn.returnNumber}
              </CardTitle>
              <Badge variant="outline">{gregorianToPersian(purchaseReturn.returnDate)}</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">تامین‌کننده</p>
                <p className="font-medium text-card-foreground">{purchaseReturn.supplierName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">فاکتور خرید مبدا</p>
                <p className="font-medium text-card-foreground">{purchaseReturn.purchaseInvoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">دلیل غالب</p>
                <p className="font-medium text-card-foreground">
                  {PURCHASE_RETURN_REASON_LABELS[purchaseReturn.reason] ?? purchaseReturn.reason}
                </p>
              </div>
              {purchaseReturn.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">توضیحات</p>
                  <p className="text-card-foreground">{purchaseReturn.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                اقلام مرجوعی
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                این اطلاعات (تعداد، نوع مشکل و یادداشت) از گزارش انبار در لحظه‌ی ثبت این مرجوعی گرفته شده است.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground text-xs">
                    <tr>
                      <th className="text-right px-3 py-2.5 font-medium">کالا</th>
                      <th className="text-center px-2 py-2.5 font-medium">تعداد</th>
                      <th className="text-center px-2 py-2.5 font-medium">قیمت واحد</th>
                      <th className="text-center px-2 py-2.5 font-medium">نوع مشکل</th>
                      <th className="text-center px-2 py-2.5 font-medium">جمع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchaseReturn.items.map((item) => (
                      <tr key={item.productId}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-card-foreground text-sm">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.productCode}</p>
                          {item.note && <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">{item.qty.toLocaleString("fa-IR")}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{item.unitPrice.toLocaleString("fa-IR")}</td>
                        <td className="px-2 py-2 text-center text-xs">
                          {PURCHASE_RETURN_REASON_LABELS[item.reason] ?? item.reason}
                        </td>
                        <td className="px-2 py-2 text-center tabular-nums">{item.lineTotal.toLocaleString("fa-IR")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted border-t border-border">
                    <tr>
                      <td colSpan={4} className="px-3 py-2.5 text-sm font-medium text-muted-foreground text-right">
                        جمع کل:
                      </td>
                      <td className="px-2 py-2.5 text-center text-sm font-bold text-card-foreground">
                        {purchaseReturn.totalAmount.toLocaleString("fa-IR")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <PurchaseReturnResolutionSection
            formData={purchaseReturn}
            totalAmount={purchaseReturn.totalAmount}
            onUpdateStatus={handleUpdateStatus}
            isBusy={isBusy}
          />

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
              این مرجوعی وارد مرحله‌ی هماهنگی با تامین‌کننده شده و دیگر قابل حذف نیست؛
              در صورت نیاز می‌توانید آن را «لغو» کنید.
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
              پس از حذف، این کسری دوباره در تب «گزارش‌های کسری قابل پیگیری» ظاهر می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>انصراف</AlertDialogCancel>
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

  const { data: purchaseReturn, isLoading, isError } = usePurchaseReturnQuery(id);

  useEffect(() => {
    setHeader({
      title: isLoading ? "در حال بارگذاری..." : purchaseReturn ? "جزئیات مرجوعی" : "خطا",
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
        <p className="text-lg text-muted-foreground">مرجوعی مورد نظر یافت نشد.</p>
        <Button variant="outline" onClick={() => navigate(ROUTES.PURCHASES_RETURNS_LIST)}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return <PurchaseReturnDetailForm key={purchaseReturn.id} purchaseReturn={purchaseReturn} />;
}