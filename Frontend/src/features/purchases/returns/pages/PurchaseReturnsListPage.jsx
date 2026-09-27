import { Undo2 } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { ROUTES } from "@/shared/constants/routes";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";

import PurchaseReturnFilters from "../components/table/PurchaseReturnFilters";
import PurchaseReturnTable from "../components/table/PurchaseReturnTable";
import { useDebouncedPurchaseReturnFilters } from "../hooks/useDebouncedPurchaseReturnFilters";
import { usePurchaseReturnsQuery } from "../services/queries";
import { usePurchaseReturnFilterStore } from "../store/purchaseReturnFilterStore";

export default function PurchaseReturnsListPage() {
  const listState = usePurchaseReturnFilterStore();
  const filters = useDebouncedPurchaseReturnFilters();
  const query = usePurchaseReturnsQuery(filters, listState.pagination, listState.sorting);
  const { suppliers, isLoading: isSuppliersLoading } = useSuppliersOptionsQuery();

  usePageHeader({ title: "مرجوعی به تامین‌کننده" });

  return (
    <ListPageLayout
      title="مرجوعی به تامین‌کننده"
      icon={Undo2}
      description="ادعاهای ثبت‌شده روی خریدها و تصمیم‌هایی که برایشان گرفته شده."
      create={{ label: "ثبت مرجوعی جدید", to: ROUTES.PURCHASES_RETURNS_NEW }}
    >
      <PurchaseReturnFilters suppliers={suppliers} isSuppliersLoading={isSuppliersLoading} />
      <ServerTable query={query} listState={listState} table={PurchaseReturnTable} />
    </ListPageLayout>
  );
}
