import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePlus2, Lock, LockOpen } from "lucide-react";
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
} from "@/shared/components/ui/alert-dialog";
import OrderItemsReadOnly from "@/shared/components/forms/OrderItemsReadOnly";
import UnitsPageLink from "@/features/warehouse/units/components/UnitsPageLink";
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

/** «مانده»ی یک قلم: بدهکار، بسته‌شده، یا کامل. */
function RemainingCell({ item }) {
  const shortClosed = Number(item.shortClosedQuantity) || 0;
  if (shortClosed > 0) {
    return (
      <Badge variant="secondary" className="gap-1 font-normal">
        <Lock className="h-3 w-3" />
        {fa(shortClosed)} بسته‌شده
      </Badge>
    );
  }
  const owed = stillOwedOf(item);
  return owed > 0 ? fa(owed) : <span className="text-muted-foreground">—</span>;
}

/**
 * اقلامِ یک خریدِ بیرون از پیش‌فاکتور — مبلغ‌ها و وضعیتِ دریافت در یک کارت.
 *
 * ستون‌های «رسیده» و «مانده» (`quantity − received − shortClosed`) از
 * `PurchaseItemDto` می‌آیند. قلمی را که تامین‌کننده بقیه‌اش را نمی‌فرستد
 * همین‌جا می‌شود بست (`ClosePurchaseItem`) — فقط بعد از اولین دریافت.
 *
 * زیرِ هر قلم گزارشِ انباردار از دریافت (خرابی، مازادِ در قرنطینه،
 * مغایرت‌ها) می‌آید و کالای سفارش‌نداده پایینِ کارت، تا واحد خرید همین‌جا
 * ببیند و برایش مرجوعی ثبت کند.
 */
export default function PurchaseItemsCard({ purchase }) {
  const { can } = usePermission();
  const canManageLines = can("PurchaseItemClose");

  const closeMutation = useClosePurchaseItemMutation(purchase.id);
  const reopenMutation = useReopenPurchaseItemMutation(purchase.id);
  const [closing, setClosing] = useState(null);
  const busy = closeMutation.isPending || reopenMutation.isPending;
  const hasReceived = (purchase.items || []).some((item) => Number(item.receivedQuantity) > 0);
  const navigate = useNavigate();
  const { data: info } = usePurchaseReceivingInfoQuery(hasReceived ? purchase.id : null);
  const unlisted = (info?.unlistedItems || []).filter(
    (entry) => (Number(entry.quarantinedQuantity) || 0) > 0,
  );
  const hasProblems =
    (info?.discrepancies || []).length > 0 ||
    unlisted.length > 0 ||
    (info?.items || []).some(
      (entry) =>
        (Number(entry.quarantinedOnOrderQuantity) || 0) > 0 ||
        (Number(entry.quarantinedExcessQuantity) || 0) > 0,
    );

  const confirmClose = () => {
    if (!closing) return;
    closeMutation.mutate(closing.id, { onSettled: () => setClosing(null) });
  };

  const renderActions = (item) => (
    <>
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
          بستن قلم
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
    </>
  );

  return (
    <>
      <OrderItemsReadOnly
        title="اقلام خرید"
        headerAction={
          hasReceived && (
            <UnitsPageLink
              params={{ view: "unlabeled", purchaseId: purchase.id }}
              label="برچسب دانه‌های این خرید"
            />
          )
        }
        items={purchase.items || []}
        totalAmount={purchase.totalAmount}
        renderDetails={
          info ? (item) => <ReceivingReportLines {...lineReceivingReport(info, item.id)} /> : undefined
        }
        footer={
          <>
            {unlisted.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">کالای سفارش‌نداده</p>
                {unlisted.map((entry) => (
                  <div key={entry.productId} className="space-y-1">
                    <p className="text-sm">{entry.productName}</p>
                    <ReceivingReportLines
                      quarantined={[
                        { label: "در قرنطینه (سفارش‌نداده)", quantity: entry.quarantinedQuantity },
                      ]}
                      discrepancies={(info?.discrepancies || []).filter(
                        (d) =>
                          d.custodyReason === UnitCustodyReasonEnum.UNLISTED &&
                          d.productId === entry.productId,
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
                className="w-full gap-1.5"
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
          </>
        }
        description="اقلام فقط در مرحله‌ی پیش‌فاکتور قابل ویرایش‌اند. قلمی را که تامین‌کننده بقیه‌اش را نمی‌فرستد می‌توانید ببندید."
        columns={[
          { key: "received", label: "رسیده", render: (item) => fa(item.receivedQuantity) },
          { key: "remaining", label: "مانده", render: (item) => <RemainingCell item={item} /> },
        ]}
        renderActions={canManageLines ? renderActions : undefined}
      />

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
    </>
  );
}
