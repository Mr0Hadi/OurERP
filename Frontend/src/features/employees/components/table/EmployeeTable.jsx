import { useMemo } from "react";

import DataTable from "@/shared/components/table/DataTable";
import { Badge } from "@/shared/components/ui/badge";
import { OrgRoleEnum } from "@/shared/domain/enums/orgRole";

import EmployeeStatusBadge from "./EmployeeStatusBadge";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { detailsColumn } from "@/shared/components/table/columns";

/** کارمند غیرفعال کم‌رنگ می‌شود تا در فهرست از فعال‌ها تفکیک شود. */
const rowClassName = (row) =>
  row.original.isActive ? "" : "opacity-60 bg-muted/30";

export default function EmployeeTable({
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
        accessorKey: "personelCode",
        header: "کد پرسنلی",
        cell: (info) => (
          <span className="font-mono text-sm text-muted-foreground">
            {info.getValue() || "—"}
          </span>
        ),
      },
      {
        id: "fullName",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`.trim(),
        header: "نام و نام‌خانوادگی",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      },
      {
        accessorKey: "username",
        header: "نام کاربری",
        cell: (info) => (
          <span className="font-mono text-sm" dir="ltr">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "departmentName",
        header: "واحد",
        cell: (info) => (
          <Badge variant="outline" className="font-normal">
            {info.getValue() ?? "—"}
          </Badge>
        ),
      },
      {
        accessorKey: "teamName",
        header: "تیم",
        cell: (info) =>
          info.getValue() ? (
            <span className="text-sm">{info.getValue()}</span>
          ) : (
            <span className="text-sm text-muted-foreground">بدون تیم</span>
          ),
      },
      {
        // `roleTitle` متنِ فارسیِ آماده‌ی سرور است؛ «عضو» کم‌رنگ می‌ماند تا
        // مسئول‌ها و جانشین‌ها در فهرست دیده شوند.
        accessorKey: "roleTitle",
        header: "نقش",
        cell: ({ row }) =>
          row.original.role === OrgRoleEnum.MEMBER ? (
            <span className="text-sm text-muted-foreground">
              {row.original.roleTitle}
            </span>
          ) : (
            <Badge variant="secondary" className="font-normal">
              {row.original.roleTitle}
            </Badge>
          ),
      },
      {
        accessorKey: "isActive",
        header: "وضعیت",
        cell: (info) => <EmployeeStatusBadge isActive={info.getValue()} />,
      },
      detailsColumn((row) => routeWithId(ROUTES.EMPLOYEES_DETAIL, row.id)),
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
      // `GetUserList` هیچ پارامترِ مرتب‌سازی نمی‌گیرد؛ ترتیب را سرور می‌دهد.
      sortable={false}
      rowClassName={rowClassName}
      emptyMessage="کارمندی یافت نشد."
    />
  );
}
