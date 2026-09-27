import { Undo2 } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { ROUTES } from "@/shared/constants/routes";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { useCustomersOptionsQuery } from "@/features/customers/services/queries";

import SalesReturnFilters from "../components/table/SalesReturnFilters";
import SalesReturnTable from "../components/table/SalesReturnTable";
import { useDebouncedSalesReturnFilters } from "../hooks/useDebouncedSalesReturnFilters";
import { useSalesReturnsQuery } from "../services/queries";
import { useSalesReturnFilterStore } from "../store/salesReturnFilterStore";

export default function SalesReturnsListPage() {
  const listState = useSalesReturnFilterStore();
  const filters = useDebouncedSalesReturnFilters();
  const query = useSalesReturnsQuery(filters, listState.pagination, listState.sorting);
  const { customers, isLoading: isCustomersLoading } = useCustomersOptionsQuery();

  usePageHeader({ title: "مرجوعی از فروش" });

  return (
    <ListPageLayout
      title="مرجوعی از فروش"
      icon={Undo2}
      create={{ label: "ثبت مرجوعی جدید", to: ROUTES.SALES_RETURNS_NEW }}
    >
      <SalesReturnFilters customers={customers} isCustomersLoading={isCustomersLoading} />
      <ServerTable query={query} listState={listState} table={SalesReturnTable} />
    </ListPageLayout>
  );
}
