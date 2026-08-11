import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import DataTable from "@/shared/components/table/DataTable";
import { gregorianToPersian } from "@/shared/utils/dateUtils";
import { ROUTES } from "@/shared/constants/routes";
import { OUTGOING_TYPES } from "../../services/outgoingQueueApi";
import ShippingTypeBadge from "./ShippingTypeBadge";

// صف ارسال از دو منبع پر می‌شود، پس شناسه‌ی خودِ ردیف کلید است نه اندیس.
const getRowKey = (row) => row.original.id;

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
        accessorKey: "refNumber",
        header: "شماره",
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "counterpartyName",
        header: "مشتری",
        cell: (info) => <span className="font-light">{info.getValue()}</span>,
      },
      {
        accessorKey: "date",
        header: "تاریخ",
        cell: (info) => (
          <span className="tabular-nums text-sm">
            {gregorianToPersian(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "نوع",
        enableSorting: false,
        cell: (info) => <ShippingTypeBadge type={info.getValue()} />,
      },
      {
        accessorKey: "itemsCount",
        header: "تعداد اقلام",
        cell: (info) => (
          <span className="tabular-nums text-sm">
            {info.getValue().toLocaleString("fa-IR")}
          </span>
        ),
      },
      {
        accessorKey: "remainingQty",
        header: "تعداد باقی‌مانده",
        cell: (info) => (
          <span className="tabular-nums text-sm">
            {info.getValue().toLocaleString("fa-IR")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "عملیات",
        enableSorting: false,
        cell: ({ row }) => {
          const isReplacement =
            row.original.type === OUTGOING_TYPES.RETURN_REPLACEMENT;
          const path = isReplacement
            ? ROUTES.WAREHOUSE_SHIPPING_REPLACEMENT_DETAIL.replace(
                ":returnId",
                row.original.returnId,
              )
            : ROUTES.WAREHOUSE_SHIPPING_DETAIL.replace(
                ":id",
                row.original.saleId,
              );
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(path)}
              className="gap-1"
            >
              <Truck className="h-4 w-4" />
              {isReplacement ? "ارسال کالای جایگزین" : "آماده‌سازی و ارسال"}
            </Button>
          );
        },
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
      emptyMessage="چیزی برای ارسال یافت نشد."
      getRowKey={getRowKey}
    />
  );
};

export default ShippingTable;
