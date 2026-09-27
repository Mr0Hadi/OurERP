import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { ROUTES } from "@/shared/constants/routes";

import CustomerFilters from "../components/CustomerFilters";
import CustomerTable from "../components/CustomerTable";
import { useDebouncedCustomerFilters } from "../hooks/useDebouncedCustomerFilters";
import { useCustomersQuery } from "../services/queries";
import { useCustomerFilterStore } from "../store/customerFilterStore";

export default function CustomersPage() {
  const listState = useCustomerFilterStore();
  const filters = useDebouncedCustomerFilters();
  const query = useCustomersQuery(filters, listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="مدیریت مشتریان"
      create={{ label: "مشتری جدید", to: ROUTES.CUSTOMERS_NEW }}
    >
      <CustomerFilters />
      <ServerTable query={query} listState={listState} table={CustomerTable} />
    </ListPageLayout>
  );
}
