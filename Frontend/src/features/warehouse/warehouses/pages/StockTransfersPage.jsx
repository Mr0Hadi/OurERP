import { ArrowLeftRight } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import Notice from "@/shared/components/feedback/Notice";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { ROUTES } from "@/shared/constants/routes";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useStockTransfersQuery } from "../services/queries";
import { useStockTransferFilterStore } from "../store/stockTransferFilterStore";
import { useMultiWarehouse } from "../hooks/useMultiWarehouse";
import StockTransferFilters from "../components/StockTransferFilters";
import StockTransferTable from "../components/StockTransferTable";

/**
 * «حواله‌ی بین انبار» (`GetStockTransferList`). حواله‌ی تازه فقط با چندانبارِ روشن؛ فهرست، تحویل و لغوِ حواله‌های
 * قبلی همیشه باز است تا کارِ نیمه‌کاره با خاموش‌شدنِ سوییچ گیر نکند.
 */
export default function StockTransfersPage() {
  const { allows } = usePermission();
  const multi = useMultiWarehouse();
  usePageHeader({ title: "حواله‌ی بین انبار" });

  const listState = useStockTransferFilterStore();
  const filters = useDebouncedFilters(useStockTransferFilterStore, {
    text: ["search"],
    instant: ["statuses", "fromWarehouseId", "toWarehouseId", "fromDate", "toDate"],
  });
  const query = useStockTransfersQuery(filters, listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="حواله‌ی بین انبار"
      icon={ArrowLeftRight}
      description="جابه‌جاییِ دانه‌ها از یک انبار به انبارِ دیگر؛ تا تحویل، دانه‌ها «در راه» و بیرون از موجودی‌اند."
      create={
        multi.enabled && allows("StockTransferManage")
          ? { label: "حواله‌ی تازه", to: ROUTES.WAREHOUSE_TRANSFERS_NEW }
          : undefined
      }
    >
      {!multi.isPending && !multi.enabled && (
        <Notice tone="info">چندانبار خاموش است؛ حواله‌ی تازه ثبت نمی‌شود، ولی حواله‌های در راه را هنوز می‌شود تحویل یا لغو کرد.</Notice>
      )}
      <StockTransferFilters />
      <ServerTable query={query} listState={listState} table={StockTransferTable} />
    </ListPageLayout>
  );
}
