import { Undo2 } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import ReturnFilters from "@/shared/components/returns/ReturnFilters";
import { ROUTES } from "@/shared/constants/routes";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";

import PurchaseReturnTable from "../components/table/PurchaseReturnTable";
import { usePurchaseReturnListFilters, usePurchaseReturnsQuery } from "../services/queries";
import { usePurchaseReturnFilterStore } from "../store/purchaseReturnFilterStore";
import { PURCHASE_RETURN_PROBLEM_LABELS } from "../domain/purchaseReturnVocabulary";

const PURCHASE_SIDE = sideConfig(RETURN_SIDES.PURCHASE);

export default function PurchaseReturnsListPage() {
  const listState = usePurchaseReturnFilterStore();
  const filters = usePurchaseReturnListFilters();
  const query = usePurchaseReturnsQuery(filters, listState.pagination, listState.sorting);
  const { suppliers, isLoading: isSuppliersLoading } = useSuppliersOptionsQuery();

  usePageHeader({ title: "مرجوعی به تامین‌کننده" });

  return (
    <ListPageLayout
      title="مرجوعی به تامین‌کننده"
      icon={Undo2}
      description="مشکل‌هایی که روی کالای خریده‌شده ثبت شده و تصمیمی که برای هر کدام با تامین‌کننده گرفته شده."
      create={{ label: "ثبت مرجوعی جدید", to: ROUTES.PURCHASES_RETURNS_NEW }}
    >
      <ReturnFilters
        useFilterStore={usePurchaseReturnFilterStore}
        party={{
          key: "supplierId",
          label: "تامین‌کننده",
          emptyText: "تامین‌کننده‌ای یافت نشد",
          items: suppliers,
          isLoading: isSuppliersLoading,
        }}
        side={PURCHASE_SIDE}
        problemLabels={PURCHASE_RETURN_PROBLEM_LABELS}
      />
      <ServerTable query={query} listState={listState} table={PurchaseReturnTable} />
    </ListPageLayout>
  );
}
