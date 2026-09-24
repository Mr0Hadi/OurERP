import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import DataTable from "@/shared/components/table/DataTable";
import SaleStatusBadge from "@/features/sales/orders/components/table/SaleStatusBadge";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { ROUTES } from "@/shared/constants/routes";
import {
  isReturnRow,
  queueRowKey,
  queueRowClassName,
} from "../../../shared/useQueueRows";
import {
  QueueNumberCell,
  ReturnKindBadge,
  PendingReplacementNote,
  ReturnActionCell,
} from "../../../shared/returnRowCells";

// ردیف‌ها `SaleListDto`اند، به‌علاوه‌ی ردیف‌های «کالای مرجوعی»
// (`useQueueRows`) که کلیدِ خودشان را دارند.

const ShippingTable = ({
  data,
  isLoading,
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
}) => {
  const navigate = useNavigate();

  const columns = useMemo(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "شماره فاکتور",
        cell: (info) => <QueueNumberCell row={info.row.original} />,
      },
      {
        accessorKey: "customerName",
        header: "مشتری / تامین‌کننده",
        cell: (info) => (
          <span className="font-light">
            {isReturnRow(info.row.original)
              ? info.row.original.counterpartyName
              : info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "invoiceDate",
        header: "تاریخ",
        cell: (info) => (
          <span className="tabular-nums text-sm">
            {gregorianToPersian(
              isReturnRow(info.row.original) ? info.row.original.date : info.getValue(),
            )}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "وضعیت",
        cell: (info) =>
          isReturnRow(info.row.original) ? (
            <ReturnKindBadge row={info.row.original} />
          ) : (
            <div className="flex flex-col items-center">
              <SaleStatusBadge status={info.getValue()} />
              <PendingReplacementNote row={info.row.original} />
            </div>
          ),
      },
      {
        id: "actions",
        header: "عملیات",
        enableSorting: false,
        cell: ({ row }) =>
          isReturnRow(row.original) ? (
            <ReturnActionCell row={row.original} navigate={navigate} />
          ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(
                ROUTES.WAREHOUSE_SHIPPING_DETAIL.replace(":id", row.original.id),
              )
            }
            className="gap-1"
          >
            <Truck className="h-4 w-4" />
            آماده‌سازی و ارسال
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
      emptyMessage="فروشی در انتظار ارسال نیست."
      getRowKey={queueRowKey}
      rowClassName={queueRowClassName}
    />
  );
};

export default ShippingTable;
