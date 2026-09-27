import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { ROUTES } from "@/shared/constants/routes";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";

import PurchaseFilters from "../components/table/PurchaseFilters";
import PurchaseTable from "../components/table/PurchaseTable";
import { useDebouncedPurchaseFilters } from "../hooks/useDebouncedPurchaseFilters";
import { usePurchasesQuery } from "../services/queries";
import { usePurchaseFilterStore } from "../store/purchaseFilterStore";

export default function PurchasesPage() {
  const listState = usePurchaseFilterStore();
  const filters = useDebouncedPurchaseFilters();
  const query = usePurchasesQuery(filters, listState.pagination, listState.sorting);
  const { suppliers, isLoading: isSuppliersLoading } = useSuppliersOptionsQuery();

  return (
    <ListPageLayout
      title="مدیریت خریدها"
      create={{ label: "خرید جدید", to: ROUTES.PURCHASES_NEW }}
    >
      <PurchaseFilters suppliers={suppliers} isSuppliersLoading={isSuppliersLoading} />
      <ServerTable query={query} listState={listState} table={PurchaseTable} />
    </ListPageLayout>
  );
}
