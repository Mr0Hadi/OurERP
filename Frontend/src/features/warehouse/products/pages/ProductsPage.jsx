import DataTransferActions from "@/shared/components/dataTransfer/DataTransferActions";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { ROUTES } from "@/shared/constants/routes";

import ProductFilters from "../components/table/ProductFilters";
import ProductTable from "../components/table/ProductTable";
import { useProductListFilters, useProductsQuery } from "../services/queries";
import { productKeys } from "../services/queryKeys";
import { useProductFilterStore } from "../store/productFilterStore";

export default function ProductsPage() {
  const listState = useProductFilterStore();
  const filters = useProductListFilters();
  const query = useProductsQuery(filters, listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="مدیریت لیست کالاها"
      create={{ label: "کالای جدید", to: ROUTES.WAREHOUSE_PRODUCTS_NEW }}
      actions={<DataTransferActions resource="products" filters={filters} invalidateKey={productKeys.all} />}
    >
      <ProductFilters />
      <ServerTable query={query} listState={listState} table={ProductTable} />
    </ListPageLayout>
  );
}
