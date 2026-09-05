// src/features/warehouse/categories/components/CategoryTable.jsx
import { Pencil, Trash2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import TableLoadingSkeleton from "@/shared/components/table/TableLoadingSkeleton";

/**
 * جدولِ ساده — نه `DataTable` — چون این فهرست صفحه‌بندیِ سرور ندارد
 * (همیشه با یک `GetProductCategoryList?take=100` کامل می‌آید،
 * `useProductCategoriesQuery`). فوتِرِ صفحه‌بندی/اندازه‌صفحه‌ی `DataTable`
 * برای فهرستی که از قبل کامل است چیزی جز کنترلِ بی‌اثر نبود.
 */
export default function CategoryTable({ data, isLoading, onEdit, onDelete }) {
  if (isLoading) return <TableLoadingSkeleton />;

  if (data.length === 0) {
    return (
      <div className="rounded-md border py-10 text-center text-sm text-muted-foreground">
        دسته‌بندی‌ای یافت نشد.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">نام دسته‌بندی</TableHead>
            <TableHead className="text-center">تعداد کالا</TableHead>
            <TableHead className="text-center"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="text-center font-light">
                {category.name}
              </TableCell>
              <TableCell className="text-center tabular-nums text-muted-foreground">
                {category.productCount ?? 0}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(category)}
                    aria-label={`ویرایش ${category.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(category)}
                    aria-label={`حذف ${category.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
