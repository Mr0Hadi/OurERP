import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import DataTable from "@/shared/components/table/DataTable";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { routeWithId } from "@/shared/constants/routes";
import { isReturnRow, queueRowKey, queueRowClassName } from "./useQueueRows";
import {
  QueueNumberCell,
  ReturnKindBadge,
  PendingReplacementNote,
  ReturnActionCell,
} from "./returnRowCells";

/**
 * جدولِ صفِ دریافت یا ارسالِ انبار: ردیف‌های `PurchaseListDto`/`SaleListDto`، به‌علاوه‌ی
 * ردیف‌های «کالای مرجوعی» (`useQueueRows`) که کلیدِ خودشان را دارند. دو صف فقط در
 * طرفِ حساب، نشانِ وضعیت و دکمه‌ی ردیف فرق دارند.
 *
 * @param {object} props
 * @param {{ key: string, header: string }} props.party ستونِ طرفِ حسابِ سند
 * @param {React.ComponentType<{ status: number }>} props.StatusBadge
 * @param {{ label: string, icon: React.ComponentType, route: string }} props.action
 *   دکمه‌ی ردیفِ سند؛ پیوندِ واقعی (بازکردن در تبِ تازه کار می‌کند)
 * @param {string} props.emptyMessage
 * بقیه‌ی props همان `DataTable`.
 */
export default function QueueTable({ party, StatusBadge, action, emptyMessage, ...tableProps }) {
  const ActionIcon = action.icon;
  const columns = [
    {
      accessorKey: "invoiceNumber",
      header: "شماره فاکتور",
      cell: (info) => <QueueNumberCell row={info.row.original} />,
    },
    {
      accessorKey: party.key,
      header: party.header,
      cell: (info) => (
        <span className="font-light">
          {isReturnRow(info.row.original) ? info.row.original.counterpartyName : info.getValue()}
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
            <StatusBadge status={info.getValue()} />
            <PendingReplacementNote row={info.row.original} />
          </div>
        ),
    },
    {
      id: "actions",
      header: "عملیات",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          {isReturnRow(row.original) ? (
            <ReturnActionCell row={row.original} />
          ) : (
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to={routeWithId(action.route, row.original.id)}>
                <ActionIcon className="h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      {...tableProps}
      columns={columns}
      emptyMessage={emptyMessage}
      getRowKey={queueRowKey}
      rowClassName={queueRowClassName}
    />
  );
}
