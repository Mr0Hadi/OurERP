import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { ROUTES } from "@/shared/constants/routes";

import SupplierFilters from "../components/SupplierFilters";
import SupplierTable from "../components/SupplierTable";
import { useDebouncedSupplierFilters } from "../hooks/useDebouncedSupplierFilters";
import { useSuppliersQuery } from "../services/queries";
import { useSupplierFilterStore } from "../store/supplierFilterStore";

export default function SuppliersPage() {
  const listState = useSupplierFilterStore();
  const filters = useDebouncedSupplierFilters();
  const query = useSuppliersQuery(filters, listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="مدیریت تامین‌کنندگان"
      create={{ label: "تامین‌کننده جدید", to: ROUTES.SUPPLIERS_NEW }}
    >
      <SupplierFilters />
      <ServerTable query={query} listState={listState} table={SupplierTable} />
    </ListPageLayout>
  );
}
