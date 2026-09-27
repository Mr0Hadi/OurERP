import { useMemo } from "react";

import DataTable from "@/shared/components/table/DataTable";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { detailsColumn } from "@/shared/components/table/columns";

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
}) {

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "نام واحد",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      },
      {
        accessorKey: "headName",
        header: "مسئول واحد",
        cell: (info) =>
          info.getValue() ? (
            <span className="text-sm">{info.getValue()}</span>
          ) : (
            <span className="text-sm text-muted-foreground">تعیین نشده</span>
          ),
      },
      {
        accessorKey: "deputyName",
        header: "جانشین",
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
      detailsColumn((row) => routeWithId(ROUTES.ORG_DEPARTMENTS_DETAIL, row.id)),
    ],
    [],
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
      // `GetDepartmentList` هیچ پارامترِ مرتب‌سازی نمی‌گیرد؛ ترتیب را سرور می‌دهد.
      sortable={false}
      emptyMessage="واحدی یافت نشد."
    />
  );
}
