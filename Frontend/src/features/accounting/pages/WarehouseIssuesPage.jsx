import { PackageX } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useSaleWarehouseIssuesQuery } from "@/features/sales/orders/services/queries";
import { usePermission } from "@/features/auth/hooks/usePermission";
import {
  UNIT_ACTION_REASON_LABELS,
  UnitActionReasonEnum,
} from "@/features/warehouse/units/domain/unitVocabulary";
import DateRangeToolbar from "@/shared/components/filters/DateRangeToolbar";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import StatusBadge from "@/shared/components/status/StatusBadge";
import DataTable from "@/shared/components/table/DataTable";
import ServerTable from "@/shared/components/table/ServerTable";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { LEDGER_RANGE_PRESETS } from "@/shared/lib/dateRanges";
import { formatNumber } from "@/shared/lib/numberFormat";
import AccountingPageLayout from "../components/AccountingPageLayout";
import WarehouseIssueResolveDialog from "../components/WarehouseIssueResolveDialog";
import { useWarehouseIssueFilterStore } from "../store/warehouseIssueFilterStore";

const OPEN_OPTIONS = [
  { value: "true", label: "منتظرِ تصمیم" },
  { value: "false", label: "تصمیم‌گرفته" },
];
// علت‌هایی که بررسیِ انبار می‌پذیرد (`INSPECTION_PASSED` نه).
const REASON_OPTIONS = toFilterOptions(
  Object.fromEntries(
    Object.entries(UNIT_ACTION_REASON_LABELS).filter(([value]) => Number(value) !== UnitActionReasonEnum.INSPECTION_PASSED),
  ),
);

function columns(onResolve, canResolve) {
  return [
    {
      accessorKey: "reportedAt",
      meta: { mobile: "subtitle" },
      header: "زمان گزارش",
      cell: (info) => <span className="text-xs tabular-nums">{gregorianToPersianDateTime(info.getValue())}</span>,
    },
    {
      accessorKey: "productName",
      meta: { mobile: "title" },
      header: "کالا و دانه",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p>{row.original.productName}</p>
          <p className="font-mono text-[11px] text-muted-foreground" dir="ltr">
            {row.original.barcode}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "reasonTitle",
      header: "علت و توضیحِ انبار",
      cell: ({ row }) => (
        <div className="max-w-72 space-y-0.5 text-start">
          <StatusBadge size="sm" tone="danger">
            {row.original.reasonTitle}
          </StatusBadge>
          <p className="text-xs leading-5 text-muted-foreground">{row.original.description}</p>
          <p className="text-[11px] text-muted-foreground">{row.original.reportedByName}</p>
        </div>
      ),
    },
    {
      id: "sale",
      header: "پیش‌فاکتور",
      enableSorting: false,
      cell: ({ row }) => (
        <Link className="text-xs text-primary hover:underline" to={routeWithId(ROUTES.SALES_DETAIL, row.original.saleId)}>
          #{row.original.saleId} · {row.original.customerName}
        </Link>
      ),
    },
    {
      accessorKey: "quarantineCost",
      header: "ارزش (ریال)",
      enableSorting: false,
      cell: (info) => <span className="tabular-nums">{info.getValue() == null ? "—" : formatNumber(info.getValue())}</span>,
    },
    {
      accessorKey: "resolvedAt",
      meta: { mobile: "badge" },
      header: "تصمیم",
      cell: ({ row }) =>
        row.original.resolution == null ? (
          canResolve ? (
            <Button size="sm" variant="outline" onClick={() => onResolve(row.original)}>
              تصمیم‌گیری
            </Button>
          ) : (
            <StatusBadge size="sm" tone="caution">
              منتظرِ تصمیم
            </StatusBadge>
          )
        ) : (
          <div className="space-y-0.5 text-xs">
            <StatusBadge size="sm" tone="neutral">
              {row.original.resolutionTitle}
            </StatusBadge>
            <p className="text-muted-foreground">
              {row.original.resolvedByName} · {gregorianToPersianDateTime(row.original.resolvedAt)}
            </p>
            {row.original.resolutionNote && <p className="text-muted-foreground">{row.original.resolutionNote}</p>}
          </div>
        ),
    },
  ];
}

/**
 * صفِ گزارش‌های انبار: دانه‌هایی که انبار در بررسیِ پیش‌فاکتورها معیوب یا مفقود گزارش کرده و
 * همان لحظه قرنطینه شده‌اند. حسابداری درباره‌ی هر کدام تصمیم می‌گیرد؛ پیش‌فاکتور منتظرش نمی‌ماند.
 */
export default function WarehouseIssuesPage() {
  const listState = useWarehouseIssueFilterStore();
  const filters = useDebouncedFilters(useWarehouseIssueFilterStore, {
    text: [],
    instant: ["isOpen", "reason", "fromDate", "toDate"],
  });
  const query = useSaleWarehouseIssuesQuery(filters, listState.pagination, listState.sorting);
  const { allows } = usePermission();
  const [resolving, setResolving] = useState(null);
  const canResolve = allows("SaleWarehouseIssueResolve");
  // کامپوننتِ جدول پایدار می‌ماند تا با هر رندر از نو mount نشود.
  const Table = useMemo(() => {
    const tableColumns = columns(setResolving, canResolve);
    return function WarehouseIssueTable(props) {
      return <DataTable {...props} columns={tableColumns} emptyMessage="گزارشی نیست." />;
    };
  }, [canResolve]);

  return (
    <AccountingPageLayout
      title="گزارش‌های انبار"
      icon={PackageX}
      description="دانه‌های معیوب یا مفقود که انبار در بررسیِ پیش‌فاکتورها گزارش کرده: بازگشت به موجودی، اسقاط یا مرجوعی به تامین‌کننده."
    >
      <DateRangeToolbar
        fromDate={listState.fromDate}
        toDate={listState.toDate}
        onRangeChange={listState.setRange}
        onReset={() => listState.setRange({ fromDate: "", toDate: "" })}
        presets={LEDGER_RANGE_PRESETS}
      />
      <div className="grid gap-3 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2">
        <FilterSelect label="وضعیت" value={listState.isOpen} onChange={listState.setIsOpen} allLabel="همه" options={OPEN_OPTIONS} />
        <FilterSelect label="علت" value={listState.reason} onChange={listState.setReason} allLabel="همه" options={REASON_OPTIONS} numeric />
      </div>
      <ServerTable query={query} listState={listState} table={Table} />
      <WarehouseIssueResolveDialog issue={resolving} onOpenChange={(open) => !open && setResolving(null)} />
    </AccountingPageLayout>
  );
}
