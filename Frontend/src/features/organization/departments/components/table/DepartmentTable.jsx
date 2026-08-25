// src/features/organization/departments/components/table/DepartmentTable.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import DataTable from "@/shared/components/table/DataTable";
import { Button } from "@/shared/components/ui/button";

const rowClassName = (row) =>
  row.original.isActive === false ? "opacity-60 bg-muted/30" : "";

const CountCell = ({ value, suffix }) => (
  <span className="text-sm">
    {Number(value ?? 0).toLocaleString("fa-IR")} {suffix}
  </span>
);

export default function DepartmentTable({
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
        header: "نام واحد",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      },
      {
        accessorKey: "headName",
        header: "مدیر واحد",
        cell: (info) =>
          info.getValue() ? (
            <span className="text-sm">{info.getValue()}</span>
          ) : (
            <span className="text-sm text-muted-foreground">تعیین نشده</span>
          ),
      },
      {
        accessorKey: "teamCount",
        header: "تعداد تیم",
        cell: (info) => <CountCell value={info.getValue()} suffix="تیم" />,
      },
      {
        accessorKey: "userCount",
        header: "تعداد کارمند",
        cell: (info) => <CountCell value={info.getValue()} suffix="نفر" />,
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
            onClick={() => navigate(`/organization/departments/${row.original.id}`)}
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
      emptyMessage="واحدی یافت نشد."
    />
  );
}
