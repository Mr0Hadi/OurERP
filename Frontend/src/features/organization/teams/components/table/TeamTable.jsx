// src/features/organization/teams/components/table/TeamTable.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";

const rowClassName = (row) =>
  row.original.isActive === false ? "opacity-60 bg-muted/30" : "";

export default function TeamTable({
  data,
  isLoading,
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
}) {
  const navigate = useNavigate();

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "نام تیم",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      },
      {
        accessorKey: "departmentName",
        header: "واحد سازمانی",
        cell: (info) => (
          <Badge variant="outline" className="font-normal">
            {info.getValue() ?? "—"}
          </Badge>
        ),
      },
      {
        accessorKey: "headName",
        header: "مدیر تیم",
        cell: (info) =>
          info.getValue() ? (
            <span className="text-sm">{info.getValue()}</span>
          ) : (
            <span className="text-sm text-muted-foreground">تعیین نشده</span>
          ),
      },
      {
        accessorKey: "userCount",
        header: "تعداد اعضا",
        cell: (info) => (
          <span className="text-sm">
            {Number(info.getValue() ?? 0).toLocaleString("fa-IR")} نفر
          </span>
        ),
      },
      {
        id: "actions",
        header: "جزئیات",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => navigate(`/organization/teams/${row.original.id}`)}
          >
            جزئیات
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      totalPages={totalPages}
      currentPage={currentPage}
      pageSize={pageSize}
      onPaginationChange={onPaginationChange}
      sorting={sorting}
      onSortingChange={onSortingChange}
      rowClassName={rowClassName}
      emptyMessage="تیمی یافت نشد."
    />
  );
}
