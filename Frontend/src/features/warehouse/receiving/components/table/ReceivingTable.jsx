import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import DataTable from "@/shared/components/table/DataTable";
import PurchaseStatusBadge from "@/features/purchases/orders/components/table/PurchaseStatusBadge";
import { PURCHASE_STATUS_LABELS } from "@/shared/domain/enums/purchaseStatus";
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

// ردیف‌ها `PurchaseListDto`اند، به‌علاوه‌ی ردیف‌های «کالای مرجوعی»
// (`useQueueRows`) که کلیدِ خودشان را دارند.

const ReceivingTable = ({
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
        accessorKey: "supplierName",
        header: "تامین‌کننده / مشتری",
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
              <PurchaseStatusBadge
                status={info.getValue()}
                labels={PURCHASE_STATUS_LABELS}
              />
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
            <div className="flex justify-center">
              <ReturnActionCell row={row.original} navigate={navigate} />
            </div>
          ) : (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  ROUTES.WAREHOUSE_RECEIVING_DETAIL.replace(
                    ":id",
                    row.original.id,
                  ),
                )
              }
              className="gap-1"
            >
              <CheckCircle className="h-4 w-4" />
              بررسی و دریافت
            </Button>
          </div>
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
      emptyMessage="خریدی در انتظار دریافت نیست."
      getRowKey={queueRowKey}
      rowClassName={queueRowClassName}
    />
  );
};

export default ReceivingTable;
