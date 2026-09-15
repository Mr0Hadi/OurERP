import { useNavigate } from "react-router-dom";
import { ShieldAlert, FilePlus2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { RETURN_PROBLEM_LABELS } from "@/shared/domain/returns/problems";
import { UNIT_CUSTODY_REASON_LABELS } from "@/shared/domain/enums/unitStatus";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { ROUTES } from "@/shared/constants/routes";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * کالای این خرید که الان در قرنطینه است، و مغایرت‌های ثبت‌شده در دورهای
 * قبل. «ثبت مغایرت» فرمِ مرجوعیِ خرید را از همین کالاها پیش‌پر می‌کند.
 */
export default function ReceivingQuarantineCard({ receivingInfo }) {
  const navigate = useNavigate();
  const lines = (receivingInfo.items || []).filter(
    (item) => item.quarantinedOnOrderQuantity > 0 || item.quarantinedExcessQuantity > 0,
  );
  const unlisted = (receivingInfo.unlistedItems || []).filter(
    (item) => item.quarantinedQuantity > 0,
  );
  const discrepancies = receivingInfo.discrepancies || [];

  if (lines.length === 0 && unlisted.length === 0 && discrepancies.length === 0) {
    return null;
  }

  const hasQuarantine = lines.length > 0 || unlisted.length > 0;

  return (
    <Card className="border-orange-200 dark:border-orange-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-orange-600" />
          قرنطینه و مغایرت‌ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {hasQuarantine && (
          <ul className="space-y-1">
            {lines.map((item) => (
              <li key={item.purchaseItemId} className="flex justify-between gap-2">
                <span className="truncate">{item.productName}</span>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {item.quarantinedOnOrderQuantity > 0 &&
                    `خراب ${fa(item.quarantinedOnOrderQuantity)}`}
                  {item.quarantinedOnOrderQuantity > 0 &&
                    item.quarantinedExcessQuantity > 0 &&
                    " · "}
                  {item.quarantinedExcessQuantity > 0 &&
                    `مازاد ${fa(item.quarantinedExcessQuantity)}`}
                </span>
              </li>
            ))}
            {unlisted.map((item) => (
              <li key={`u-${item.productId}`} className="flex justify-between gap-2">
                <span className="truncate">{item.productName}</span>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  سفارش‌نداده {fa(item.quarantinedQuantity)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {discrepancies.length > 0 && (
          <details className="rounded-md border border-border p-2">
            <summary className="cursor-pointer text-muted-foreground">
              سابقه‌ی مغایرت‌های دریافت ({fa(discrepancies.length)})
            </summary>
            <ul className="mt-2 space-y-1">
              {discrepancies.map((d) => (
                <li key={d.id} className="text-muted-foreground">
                  {gregorianToPersian(d.receivedAt)} · {d.productName} ·{" "}
                  {fa(d.quantity)} {RETURN_PROBLEM_LABELS[d.problem] ?? d.problem} (
                  {UNIT_CUSTODY_REASON_LABELS[d.custodyReason] ?? d.custodyReason})
                  {d.note && ` — ${d.note}`}
                </li>
              ))}
            </ul>
          </details>
        )}

        {hasQuarantine && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={() =>
              navigate(
                `${ROUTES.PURCHASES_RETURNS_NEW}?purchaseId=${receivingInfo.purchaseId}&prefill=quarantine`,
              )
            }
          >
            <FilePlus2 className="h-4 w-4" />
            ثبت مغایرت برای کالای قرنطینه
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
