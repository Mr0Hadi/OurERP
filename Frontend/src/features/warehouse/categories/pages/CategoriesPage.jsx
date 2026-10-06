import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { formatNumber } from "@/shared/lib/numberFormat";

import { useProductCategoriesQuery } from "../services/queries";
import { useDeleteProductCategoryMutation } from "../services/mutations";
import CategoryTable from "../components/CategoryTable";
import CategoryFormDialog from "../components/CategoryFormDialog";

/** دسته‌بندی‌های کالا: فهرست با جست‌وجو، و افزودن/ویرایش/حذف با دیالوگ. */
export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const [formState, setFormState] = useState({ open: false, category: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const categoriesQuery = useProductCategoriesQuery(debouncedSearch);
  const deleteMutation = useDeleteProductCategoryMutation();

  // `?.`: React Compiler این فیلد را هنگامِ رندر هم می‌خواند، وقتی دیالوگ بسته و
  // `deleteTarget` خالی است.
  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget?.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <ListPageLayout
      title="مدیریت دسته‌بندی کالاها"
      actions={
        <Button onClick={() => setFormState({ open: true, category: null })} className="gap-2">
          <Plus className="h-4 w-4" />
          دسته‌بندی جدید
        </Button>
      }
    >
      <FilterSearchInput
        placeholder="نام دسته‌بندی..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {categoriesQuery.isError ? (
        <QueryErrorState error={categoriesQuery.error} onRetry={() => categoriesQuery.refetch()} />
      ) : (
        <CategoryTable
          data={categoriesQuery.data ?? []}
          isLoading={categoriesQuery.isLoading}
          onEdit={(category) => setFormState({ open: true, category })}
          onDelete={setDeleteTarget}
        />
      )}

      <CategoryFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        category={formState.category}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`حذف دسته‌بندی «${deleteTarget?.name ?? ""}»`}
        description={
          deleteTarget?.productCount > 0
            ? `${formatNumber(deleteTarget.productCount)} کالا در این دسته است. کالاها پاک نمی‌شوند و دسته‌شان روی آن‌ها می‌ماند؛ فقط این دسته دیگر در فهرست‌ها و انتخاب‌گرها نمی‌آید.`
            : "این دسته دیگر در فهرست‌ها و انتخاب‌گرها نمی‌آید."
        }
        confirmLabel="حذف"
        pendingLabel="در حال حذف..."
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </ListPageLayout>
  );
}
