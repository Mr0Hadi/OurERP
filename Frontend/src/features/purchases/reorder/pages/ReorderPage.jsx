import { useState } from "react";
import { Link } from "react-router-dom";
import { ListRestart, PackageCheck, SearchX } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";
import EmptyState from "@/shared/components/feedback/EmptyState";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";
import { useReorderSuggestionsQuery } from "../services/queries";
import { useCreatePurchaseDraftsMutation } from "../services/mutations";
import { useReorderFilterStore } from "../store/reorderFilterStore";
import { useReorderDraft } from "../hooks/useReorderDraft";
import { supplierNameOf } from "../domain/reorderList";
import ReorderFilters from "../components/ReorderFilters";
import ReorderTable from "../components/ReorderTable";
import ReorderActionBar from "../components/ReorderActionBar";
import ReorderResultDialog from "../components/ReorderResultDialog";

/**
 * «پیشنهاد خرید» — کالاهای رسیده به نقطه‌ی سفارش (`Reorder/GetReorderSuggestionList`) در جدولی مثلِ بقیه‌ی
 * فهرست‌ها (مرتب‌سازی، صفحه‌بندی و تازه‌سازی سمتِ کاربر، چون سرور فهرست را یک‌جا می‌دهد).
 *
 * الگو «انتخاب + نوارِ اقدامِ پایین» است، نه دکمه‌ی ساخت در هر ردیف: سرور برای هر تامین‌کننده **یک** پیش‌فاکتور
 * از هر زیرمجموعه می‌سازد (`CreatePurchaseDraftsFromReorder`)، و دکمه‌ی هر ردیف برای پنج کالای یک تامین‌کننده
 * پنج سندِ خریدِ جدا می‌ساخت. انتخاب‌ها با صفحه‌بندی و مرتب‌سازی می‌مانند؛ بعد از ساخت، پنجره‌ی نتیجه به هر
 * پیش‌فاکتور پیوند دارد.
 */
export default function ReorderPage() {
  const { allows } = usePermission();
  const editable = allows("PurchaseCreate");
  const [result, setResult] = useState(null);

  const listState = useReorderFilterStore();
  const filters = useDebouncedFilters(useReorderFilterStore, {
    text: ["search"],
    instant: ["supplierId"],
  });
  const query = useReorderSuggestionsQuery(filters, listState.pagination, listState.sorting);
  const draft = useReorderDraft(query.data?.all);
  // فقط برای نامِ تامین‌کننده‌ای که خریدار برای کالای بی‌تامین‌کننده انتخاب کرد (پنجره‌ی نتیجه).
  const { suppliers } = useSuppliersOptionsQuery();
  const createMutation = useCreatePurchaseDraftsMutation();

  const filtered = Boolean(filters.search || filters.supplierId);

  const submit = () => {
    const payload = draft.buildPayload();
    if (!payload) return;
    const rows = query.data?.all ?? [];
    createMutation.mutate(payload, {
      onSuccess: (created) => {
        draft.clear(payload.lines.map((line) => line.productId));
        setResult(
          created.map((item) => ({ ...item, supplierName: supplierNameOf(item.supplierId, rows, suppliers) })),
        );
      },
    });
  };

  const emptyState = filtered ? (
    <EmptyState
      icon={SearchX}
      title="با این فیلترها کالایی برای خرید نیست."
      action={
        <Button variant="outline" size="sm" onClick={listState.resetFilters}>
          پاک کردن فیلترها
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={PackageCheck}
      title="هیچ کالایی به نقطه‌ی سفارش نرسیده است."
      description="نقطه‌ی سفارشِ هر کالا را در صفحه‌ی همان کالا تنظیم کنید."
      action={
        <Button asChild variant="outline" size="sm">
          <Link to={ROUTES.WAREHOUSE_PRODUCTS}>رفتن به کالاها</Link>
        </Button>
      }
    />
  );

  // نوارِ ساخت بیرونِ کارتِ `ListPageLayout` است (`overflow-hidden`ِ کارت `sticky` را خنثی می‌کرد) و فرزندِ
  // مستقیمِ همین قاب، تا در تمامِ ارتفاعِ صفحه بچسبد.
  return (
    <div className="container mx-auto min-w-0">
      <ListPageLayout
        title="پیشنهاد خرید"
        icon={ListRestart}
        description="کالاهایی که موجودی‌شان به نقطه‌ی سفارش رسیده. کالاها را انتخاب کنید تا برای هر تامین‌کننده یک پیش‌فاکتورِ خرید ساخته شود."
      >
        <ReorderFilters />
        <ServerTable
          query={query}
          listState={listState}
          table={ReorderTable}
          draft={draft}
          editable={editable}
          emptyState={emptyState}
        />
      </ListPageLayout>
      {editable && draft.summary.count > 0 && (
        <ReorderActionBar
          summary={draft.summary}
          onSubmit={submit}
          onClear={draft.clearSelection}
          isPending={createMutation.isPending}
        />
      )}
      <ReorderResultDialog result={result} onOpenChange={(open) => !open && setResult(null)} />
    </div>
  );
}
