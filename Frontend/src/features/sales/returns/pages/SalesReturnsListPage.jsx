import { Undo2 } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import ReturnFilters from "@/shared/components/returns/ReturnFilters";
import { ROUTES } from "@/shared/constants/routes";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { useCustomersOptionsQuery } from "@/features/customers/services/queries";

import SalesReturnTable from "../components/table/SalesReturnTable";
import { useSalesReturnListFilters, useSalesReturnsQuery } from "../services/queries";
import { useSalesReturnFilterStore } from "../store/salesReturnFilterStore";
import { SALES_RETURN_PROBLEM_LABELS } from "../domain/salesReturnVocabulary";

const SALES_SIDE = sideConfig(RETURN_SIDES.SALES);

export default function SalesReturnsListPage() {
  const listState = useSalesReturnFilterStore();
  const filters = useSalesReturnListFilters();
  const query = useSalesReturnsQuery(filters, listState.pagination, listState.sorting);
  const { customers, isLoading: isCustomersLoading } = useCustomersOptionsQuery();

  usePageHeader({ title: "مرجوعی از فروش" });

  return (
    <ListPageLayout
      title="مرجوعی از فروش"
      icon={Undo2}
      description="مشکل‌هایی که مشتری روی کالای خریده‌شده گزارش کرده و تصمیمی که برای هر کدام گرفته شده."
      create={{ label: "ثبت مرجوعی جدید", to: ROUTES.SALES_RETURNS_NEW }}
    >
      <ReturnFilters
        useFilterStore={useSalesReturnFilterStore}
        party={{
          key: "customerId",
          label: "مشتری",
          emptyText: "مشتری‌ای یافت نشد",
          items: customers,
          isLoading: isCustomersLoading,
        }}
        side={SALES_SIDE}
        problemLabels={SALES_RETURN_PROBLEM_LABELS}
      />
      <ServerTable query={query} listState={listState} table={SalesReturnTable} />
    </ListPageLayout>
  );
}
