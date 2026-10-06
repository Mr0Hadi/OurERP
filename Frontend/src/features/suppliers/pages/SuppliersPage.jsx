import DataTransferActions from "@/shared/components/dataTransfer/DataTransferActions";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { ROUTES } from "@/shared/constants/routes";

import PartyListFilters from "@/features/partyAccount/components/PartyListFilters";
import SupplierTable from "../components/SupplierTable";
import { useSupplierListFilters, useSuppliersQuery } from "../services/queries";
import { supplierKeys } from "../services/queryKeys";
import { useSupplierFilterStore } from "../store/supplierFilterStore";

export default function SuppliersPage() {
  const listState = useSupplierFilterStore();
  const filters = useSupplierListFilters();
  const query = useSuppliersQuery(filters, listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="مدیریت تامین‌کنندگان"
      create={{ label: "تامین‌کننده جدید", to: ROUTES.SUPPLIERS_NEW }}
      actions={<DataTransferActions resource="suppliers" filters={filters} invalidateKey={supplierKeys.all} />}
    >
      <PartyListFilters
        useStore={useSupplierFilterStore}
        searchKey="companyNameOrContactName"
        searchPlaceholder="نام شرکت یا مسئول..."
      />
      <ServerTable query={query} listState={listState} table={SupplierTable} />
    </ListPageLayout>
  );
}
