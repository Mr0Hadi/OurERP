import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useStocktakesQuery } from "../services/queries";
import { useStocktakeFilterStore } from "../store/stocktakeFilterStore";
import StocktakeFilters from "../components/StocktakeFilters";
import StocktakeTable from "../components/StocktakeTable";
import StocktakeCreateDialog from "../components/StocktakeCreateDialog";

/** «انبارگردانی» — فهرستِ شمارش‌های موجودی (`GetStocktakeList`) و ساختِ شمارشِ تازه. */
export default function StocktakeListPage() {
  const navigate = useNavigate();
  const { allows } = usePermission();
  const [createOpen, setCreateOpen] = useState(false);

  const listState = useStocktakeFilterStore();
  const filters = useDebouncedFilters(useStocktakeFilterStore, {
    text: ["search"],
    instant: ["statuses", "fromDate", "toDate"],
  });
  const query = useStocktakesQuery(filters, listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="انبارگردانی"
      icon={ClipboardCheck}
      description="شمارشِ موجودیِ قفسه با اسکن یا عدد، مقایسه با سیستم و اعمالِ مغایرت پس از تأیید."
      actions={
        allows("StocktakeCount") && (
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            انبارگردانیِ تازه
          </Button>
        )
      }
    >
      <StocktakeFilters />
      <ServerTable query={query} listState={listState} table={StocktakeTable} />
      <StocktakeCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(saved) => saved?.id && navigate(routeWithId(ROUTES.WAREHOUSE_STOCKTAKE_DETAIL, saved.id))}
      />
    </ListPageLayout>
  );
}
