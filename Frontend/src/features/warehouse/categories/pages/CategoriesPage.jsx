// src/features/warehouse/categories/pages/CategoriesPage.jsx
import { useState } from "react";
import { Plus } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

import { useProductCategoriesQuery } from "../services/queries";
import { useDeleteProductCategoryMutation } from "../services/mutations";
import CategoryTable from "../components/CategoryTable";
import CategoryFormDialog from "../components/CategoryFormDialog";

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const [formState, setFormState] = useState({ open: false, category: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const categoriesQuery = useProductCategoriesQuery(debouncedSearch);
  const deleteMutation = useDeleteProductCategoryMutation();

  const categories = categoriesQuery.data ?? [];

  const openCreateDialog = () => setFormState({ open: true, category: null });
  const openEditDialog = (category) => setFormState({ open: true, category });
  const closeFormDialog = (open) =>
    setFormState((prev) => ({ ...prev, open }));

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="container mx-auto space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مدیریت دسته‌بندی کالاها</CardTitle>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            دسته‌بندی جدید
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <FilterSearchInput
            label="جستجو"
            placeholder="نام دسته‌بندی..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {categoriesQuery.isError ? (
            <QueryErrorState
              error={categoriesQuery.error}
              onRetry={() => categoriesQuery.refetch()}
            />
          ) : (
            <CategoryTable
              data={categories}
              isLoading={categoriesQuery.isLoading}
              onEdit={openEditDialog}
              onDelete={setDeleteTarget}
            />
          )}
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={formState.open}
        onOpenChange={closeFormDialog}
        category={formState.category}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف دسته‌بندی</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.productCount > 0
                ? `این دسته‌بندی روی ${deleteTarget.productCount} کالا نشسته است. حذفش کالاها را پاک نمی‌کند، فقط خودِ دسته‌بندی از فهرست‌های بعدی حذف می‌شود.`
                : "آیا از حذف این دسته‌بندی اطمینان دارید؟"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "در حال حذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
