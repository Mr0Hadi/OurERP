import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePlus2, Lock, LockOpen } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/shared/components/ui/table";
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
import { usePermission } from "@/features/auth/hooks/usePermission";
import { usePurchaseReceivingInfoQuery } from "@/features/warehouse/receiving/services/queries";
import { ReceivingReportLines } from "@/shared/components/returns/ReceivingReport";
import { lineReceivingReport } from "@/shared/domain/returns/receivingReport";
import { UnitCustodyReasonEnum } from "@/shared/domain/enums/unitStatus";
import { ROUTES } from "@/shared/constants/routes";
import {
  stillOwedOf,
  canClosePurchaseItem,
  canReopenPurchaseItem,
} from "../../domain/purchaseRules";
import {
  useClosePurchaseItemMutation,
  useReopenPurchaseItemMutation,
} from "../../services/mutations";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * وضعیتِ دریافتِ اقلامِ خرید — از روی نسخه‌ی *ذخیره‌شده*ی سرور، نه فرم.
 *
 * ستون‌ها همان `PurchaseItemDto`اند: سفارش، رسیده، بسته‌شده و مانده‌ی
 * بدهکار (`quantity − received − shortClosed`). قلمی را که تامین‌کننده
 * بقیه‌اش را نمی‌فرستد همین‌جا می‌شود بست (`ClosePurchaseItem`).
 *
 * کنارِ هر قلم، گزارشِ انباردار از دریافت (خرابی، مازادِ در قرنطینه و
 * مغایرت‌های ثبت‌شده) هم می‌آید تا واحد خرید همین‌جا ببیند و برایش مرجوعی
 * ثبت کند؛ کالای سفارش‌نداده زیرِ جدول.
 *
 * فقط وقتی دیده می‌شود که انبار چیزی از این خرید تحویل گرفته یا قلمی
 * بسته شده؛ پیش از آن چیزی برای نشان‌دادن ندارد.
 */
export default function PurchaseItemsReceivingSection({ purchase }) {
  const items = purchase.items || [];
  const hasReceivingHistory = items.some(
    (item) =>
      (Number(item.receivedQuantity) || 0) > 0 ||
      (Number(item.shortClosedQuantity) || 0) > 0,
  );
  const navigate = useNavigate();
  const { can } = usePermission();
  const canManageLines = can("PurchaseItemClose");
  const { data: info } = usePurchaseReceivingInfoQuery(
    hasReceivingHistory ? purchase.id : null,
  );
  const unlisted = (info?.unlistedItems || []).filter(
    (entry) => (Number(entry.quarantinedQuantity) || 0) > 0,
  );
  const unlistedDiscrepancies = (info?.discrepancies || []).filter(
    (d) => d.custodyReason === UnitCustodyReasonEnum.UNLISTED,
  );
  const hasProblems =
    (info?.discrepancies || []).length > 0 ||
    unlisted.length > 0 ||
    (info?.items || []).some(
      (entry) =>
        (Number(entry.quarantinedOnOrderQuantity) || 0) > 0 ||
        (Number(entry.quarantinedExcessQuantity) || 0) > 0,
    );

  const closeMutation = useClosePurchaseItemMutation(purchase.id);
  const reopenMutation = useReopenPurchaseItemMutation(purchase.id);
  const [closing, setClosing] = useState(null);

  const busy = closeMutation.isPending || reopenMutation.isPending;

  if (!hasReceivingHistory) return null;

  const confirmClose = () => {
    if (!closing) return;
    closeMutation.mutate(closing.id, { onSettled: () => setClosing(null) });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          وضعیت دریافت اقلام
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          آنچه انبار تا الان تحویل گرفته. قلمی را که تامین‌کننده بقیه‌اش را
          نمی‌فرستد می‌توانید ببندید.
        </p>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto custom-scroll -mx-2 px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>کالا</TableHead>
                  <TableHead className="text-center">سفارش</TableHead>
                  <TableHead className="text-center">رسیده</TableHead>
                  <TableHead className="text-center">مانده</TableHead>
                  {canManageLines && <TableHead className="w-px" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const owed = stillOwedOf(item);
                  const shortClosed = Number(item.shortClosedQuantity) || 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-normal">
                        <div className="font-medium text-sm">{item.productName}</div>
                        {item.productCode && (
                          <div className="font-mono text-xs text-muted-foreground">
                            {item.productCode}
                          </div>
                        )}
                        <div className="mt-1 min-w-48">
                          <ReceivingReportLines {...lineReceivingReport(info, item.id)} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {fa(item.quantity)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {fa(item.receivedQuantity)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {shortClosed > 0 ? (
                          <Badge variant="secondary" className="gap-1 font-normal">
                            <Lock className="h-3 w-3" />
                            {fa(shortClosed)} بسته‌شده
                          </Badge>
                        ) : owed > 0 ? (
                          fa(owed)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canManageLines && (
                        <TableCell>
                          {canClosePurchaseItem(purchase, item) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs"
                              disabled={busy}
                              onClick={() => setClosing(item)}
                            >
                              <Lock className="h-3 w-3" />
                              بستن
                            </Button>
                          )}
                          {canReopenPurchaseItem(purchase, item) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-xs"
                              disabled={busy}
                              onClick={() => reopenMutation.mutate(item.id)}
                            >
                              <LockOpen className="h-3 w-3" />
                              بازگشایی
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </div>

        {unlisted.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium">کالای سفارش‌نداده</p>
            {unlisted.map((entry) => (
              <div key={entry.productId} className="space-y-1">
                <p className="text-sm">{entry.productName}</p>
                <ReceivingReportLines
                  quarantined={[
                    { label: "در قرنطینه (سفارش‌نداده)", quantity: entry.quarantinedQuantity },
                  ]}
                  discrepancies={unlistedDiscrepancies.filter(
                    (d) => d.productId === entry.productId,
                  )}
                />
              </div>
            ))}
          </div>
        )}

        {hasProblems && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 w-full gap-1.5"
            onClick={() =>
              navigate(
                `${ROUTES.PURCHASES_RETURNS_NEW}?purchaseId=${purchase.id}&prefill=quarantine`,
              )
            }
          >
            <FilePlus2 className="h-4 w-4" />
            ثبت مرجوعی برای مشکلات گزارش‌شده
          </Button>
        )}
      </CardContent>

      <AlertDialog open={!!closing} onOpenChange={(open) => !open && setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>بستن قلم «{closing?.productName}»</AlertDialogTitle>
            <AlertDialogDescription>
              {fa(closing ? stillOwedOf(closing) : 0)} عدد باقیمانده‌ی این قلم دیگر
              انتظار نمی‌رود و وضعیت خرید از نو حساب می‌شود. فاکتور ویرایش
              نمی‌شود، ولی سهمِ این مقدار از «مبلغ قابل پرداخت» و از بدهی ما به
              تامین‌کننده کم می‌شود. پولی خودکار برنمی‌گردد؛ اگر بابت این مقدار
              پرداخت شده، بازگشتش را در کارت پرداخت‌ها با «پول برگشتی» ثبت کنید.
              بعداً می‌توانید قلم را دوباره باز کنید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeMutation.isPending}>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose} disabled={closeMutation.isPending}>
              {closeMutation.isPending ? "در حال بستن..." : "بستن قلم"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
