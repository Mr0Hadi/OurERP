import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { ROUTES } from "@/shared/constants/routes";

import SaleFilters from "../components/table/SaleFilters";
import SaleTable from "../components/table/SaleTable";
import { useSaleListFilters, useSalesQuery } from "../services/queries";
import { useSaleFilterStore } from "../store/saleFilterStore";

export default function SalePage() {
  const listState = useSaleFilterStore();
  const filters = useSaleListFilters();
  const query = useSalesQuery(filters, listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="مدیریت فروش‌ها"
      create={{ label: "فروش جدید", to: ROUTES.SALES_NEW }}
    >
      <SaleFilters />
      <ServerTable query={query} listState={listState} table={SaleTable} />
    </ListPageLayout>
  );
}
