import DataTransferActions from "@/shared/components/dataTransfer/DataTransferActions";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { ROUTES } from "@/shared/constants/routes";

import PartyListFilters from "@/features/partyAccount/components/PartyListFilters";
import CustomerTable from "../components/CustomerTable";
import { useCustomerListFilters, useCustomersQuery } from "../services/queries";
import { customerKeys } from "../services/queryKeys";
import { useCustomerFilterStore } from "../store/customerFilterStore";

export default function CustomersPage() {
  const listState = useCustomerFilterStore();
  const filters = useCustomerListFilters();
  const query = useCustomersQuery(filters, listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="مدیریت مشتریان"
      create={{ label: "مشتری جدید", to: ROUTES.CUSTOMERS_NEW }}
      actions={<DataTransferActions resource="customers" filters={filters} invalidateKey={customerKeys.all} />}
    >
      <PartyListFilters
        useStore={useCustomerFilterStore}
        searchKey="fullName"
        searchPlaceholder="نام مشتری..."
      />
      <ServerTable query={query} listState={listState} table={CustomerTable} />
    </ListPageLayout>
  );
}
