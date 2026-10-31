import { useState } from "react";
import { FileCheck2 } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useChequesQuery } from "../services/queries";
import { useChequeFilterStore } from "../store/chequeFilterStore";
import ChequeFilters from "../components/ChequeFilters";
import ChequeSummary from "../components/ChequeSummary";
import ChequeTable from "../components/ChequeTable";
import ChequeActionDialog from "../components/ChequeActionDialog";

/**
 * «چک‌ها» — همه‌ی چک‌های دریافتی و پرداختی (روی فاکتور، قسط یا علی‌الحساب) با سررسید و وضعیت (`GetCheckList`)، و
 * وصول، برگشت و خرج کردنشان. پیش‌فرض: چک‌های در جریان، نزدیک‌ترین سررسید اول.
 */
export default function ChequesPage() {
  const { allows } = usePermission();
  const [target, setTarget] = useState(null);
  const listState = useChequeFilterStore();
  const filters = useDebouncedFilters(useChequeFilterStore, {
    text: ["search"],
    instant: ["direction", "statuses", "fromDueDate", "toDueDate", "customerId", "supplierId", "bankAccountId", "includeVoided"],
  });
  const query = useChequesQuery(filters, listState.pagination, listState.sorting);
  const actions = allows("CheckManage")
    ? {
        onCash: (cheque) => setTarget({ kind: "cash", cheque }),
        onBounce: (cheque) => setTarget({ kind: "bounce", cheque }),
        onEndorse: (cheque) => setTarget({ kind: "endorse", cheque }),
      }
    : undefined;

  return (
    <ListPageLayout
      title="چک‌ها"
      icon={FileCheck2}
      description="چک‌های دریافتی و پرداختی؛ چکِ در جریان در مانده‌ی هیچ صندوق و بانکی نیست تا وصول شود."
    >
      <ChequeSummary summary={query.data?.summary} />
      <ChequeFilters />
      <ServerTable query={query} listState={listState} table={ChequeTable} actions={actions} />
      <ChequeActionDialog target={target} onOpenChange={(open) => !open && setTarget(null)} />
    </ListPageLayout>
  );
}
