import { useState } from "react";
import { Link } from "react-router-dom";
import { HandCoins, List } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";
import { usePermission } from "@/features/auth/hooks/usePermission";
import PartyPaymentFormDialog from "./PartyPaymentFormDialog";

/**
 * نوارِ «علی‌الحساب» در صفحه‌ی مشتری/تامین‌کننده: ثبتِ دریافت/پرداختِ بی فاکتور برای همین شخص و رفتن به فهرستِ
 * علی‌الحساب‌هایش. بی هیچ‌کدام از دو دسترسی چیزی رندر نمی‌شود.
 *
 * @param customerId / supplierId دقیقاً یکی
 */
export default function PartyOnAccountBar({ customerId, supplierId }) {
  const { allows, can } = usePermission();
  const [open, setOpen] = useState(false);
  const canCreate = allows("PartyPaymentCreate");
  const canList = can(["PartyStatementView", "PartyPaymentCreate"]);
  if (!canCreate && !canList) return null;

  const party = supplierId ? { supplierId } : { customerId };
  const listUrl = `${ROUTES.TREASURY_PARTY_PAYMENTS}?${supplierId ? `supplierId=${supplierId}` : `customerId=${customerId}`}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canCreate && (
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
          <HandCoins className="size-4" />
          {supplierId ? "پرداختِ علی‌الحساب" : "دریافتِ علی‌الحساب"}
        </Button>
      )}
      {canList && (
        <Button asChild size="sm" variant="ghost" className="gap-1.5">
          <Link to={listUrl}>
            <List className="size-4" />
            علی‌الحساب‌های این {supplierId ? "تامین‌کننده" : "مشتری"}
          </Link>
        </Button>
      )}
      <PartyPaymentFormDialog open={open} onOpenChange={setOpen} party={party} />
    </div>
  );
}
