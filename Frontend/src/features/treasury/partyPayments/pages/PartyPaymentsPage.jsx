import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HandCoins, Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { usePartyPaymentsQuery } from "../services/queries";
import { usePartyPaymentFilterStore } from "../store/partyPaymentFilterStore";
import PartyPaymentFilters from "../components/PartyPaymentFilters";
import PartyPaymentTable from "../components/PartyPaymentTable";
import PartyPaymentFormDialog from "../components/PartyPaymentFormDialog";

/**
 * «دریافت و پرداختِ علی‌الحساب» — پول‌هایی که بی فاکتور از مشتری گرفته یا به تامین‌کننده داده شده‌اند
 * (`GetPartyPaymentList`). پرداخت‌های روی فاکتور در «دفترِ دریافت و پرداخت»ِ حسابداری‌اند.
 *
 * `?customerId=5` یا `?supplierId=3` (از صفحه‌ی شخص) یک‌بار هنگامِ ورود اعمال می‌شود.
 */
export default function PartyPaymentsPage() {
  const navigate = useNavigate();
  const { allows } = usePermission();
  const [searchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  // فیلترهای نشانی پیش از اولین درخواست (مثلِ صفحه‌ی اقساط).
  useState(() => {
    const customerId = searchParams.get("customerId");
    const supplierId = searchParams.get("supplierId");
    if (!customerId && !supplierId) return;
    const { resetFilters, setCustomerId, setSupplierId } = usePartyPaymentFilterStore.getState();
    resetFilters();
    if (customerId) setCustomerId(Number(customerId));
    if (supplierId) setSupplierId(Number(supplierId));
  });

  const listState = usePartyPaymentFilterStore();
  const filters = useDebouncedFilters(usePartyPaymentFilterStore, {
    text: ["search"],
    instant: ["customerId", "supplierId", "direction", "bankAccountId", "hasUnallocated", "includeVoided", "fromDate", "toDate"],
  });
  const query = usePartyPaymentsQuery(filters, listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="دریافت و پرداختِ علی‌الحساب"
      icon={HandCoins}
      description="پولِ بی فاکتور از مشتری یا به تامین‌کننده؛ بعداً می‌شود به فاکتورهای همان شخص تخصیص داد."
      actions={
        allows("PartyPaymentCreate") && (
          <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            ثبتِ تازه
          </Button>
        )
      }
    >
      <PartyPaymentFilters />
      <ServerTable query={query} listState={listState} table={PartyPaymentTable} />
      <PartyPaymentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(saved) => saved?.id && navigate(routeWithId(ROUTES.TREASURY_PARTY_PAYMENTS_DETAIL, saved.id))}
      />
    </ListPageLayout>
  );
}
