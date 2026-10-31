import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { ROUTES } from "@/shared/constants/routes";

import PurchaseFilters from "../components/table/PurchaseFilters";
import PurchaseTable from "../components/table/PurchaseTable";
import { usePurchaseListFilters, usePurchasesQuery } from "../services/queries";
import { usePurchaseFilterStore } from "../store/purchaseFilterStore";

export default function PurchasesPage() {
  const listState = usePurchaseFilterStore();
  const filters = usePurchaseListFilters();
  const query = usePurchasesQuery(filters, listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="مدیریت خریدها"
      create={{ label: "خرید جدید", to: ROUTES.PURCHASES_NEW }}
    >
      <PurchaseFilters />
      <ServerTable query={query} listState={listState} table={PurchaseTable} />
    </ListPageLayout>
  );
}
