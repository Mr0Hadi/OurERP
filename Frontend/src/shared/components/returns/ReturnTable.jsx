import { useMemo } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import DataTable from "@/shared/components/table/DataTable";
import { detailsColumn } from "@/shared/components/table/columns";
import ReturnStatusBadge from "@/shared/components/returns/ReturnStatusBadge";
import { routeWithId } from "@/shared/constants/routes";
import { RETURN_PROBLEM_LABELS, RETURN_PROBLEM_STYLES } from "@/shared/domain/returns/problems";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";

/** حداکثر چند مشکل در ستون دیده شود؛ بقیه «+n». */
const VISIBLE_PROBLEMS = 2;

const EMPTY_STATE = (
  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
    <Search className="size-8 text-muted-foreground" />
    <p className="text-sm text-muted-foreground">مرجوعی‌ای یافت نشد.</p>
  </div>
);

const mono = (info) => <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>;

/** ستون‌های فهرستِ مرجوعی برای یک سمت. */
function columnsFor({ side, invoice, party, problemLabels, problemStyles, detailRoute }) {
  return [
    { accessorKey: "returnNumber", header: "شماره مرجوعی", cell: mono },
    { accessorKey: invoice.key, header: invoice.header, cell: mono },
    {
      accessorKey: party.key,
      header: party.header,
      cell: (info) => <span className="font-light">{info.getValue()}</span>,
    },
    {
      accessorKey: "returnDate",
      header: "تاریخ",
      cell: (info) => <span className="text-sm tabular-nums">{gregorianToPersian(info.getValue())}</span>,
    },
    {
      // یک مرجوعی می‌تواند چند ادعا با مشکل‌های متفاوت داشته باشد؛ ستون همه‌شان را
      // نشان می‌دهد، نه یک «دلیل اصلی» ساختگی.
      id: "problems",
      header: "مشکل‌ها",
      enableSorting: false,
      cell: ({ row }) => {
        const problems = row.original.problems || [];
        if (problems.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {problems.slice(0, VISIBLE_PROBLEMS).map((problem) => (
              <Badge
                key={problem}
                variant="outline"
                className={`text-[10px] ${problemStyles[problem] ?? RETURN_PROBLEM_STYLES[problem] ?? ""}`}
              >
                {problemLabels[problem] ?? RETURN_PROBLEM_LABELS[problem] ?? problem}
              </Badge>
            ))}
            {problems.length > VISIBLE_PROBLEMS && (
              <Badge variant="outline" className="text-[10px]">
                +{formatNumber(problems.length - VISIBLE_PROBLEMS)}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: (info) => <ReturnStatusBadge status={info.getValue()} side={side} />,
    },
    {
      accessorKey: "totalAmount",
      header: "مبلغ ادعا (ریال)",
      cell: (info) => <span className="text-sm tabular-nums">{formatNumber(info.getValue())}</span>,
    },
    detailsColumn((row) => routeWithId(detailRoute, row.id)),
  ];
}

/**
 * فهرستِ مرجوعی‌ها (خرید یا فروش) برای `ServerTable`.
 *
 * @param config ثابتِ ماژولِ هر سمت: `{ side, invoice: { key, header }, party: { key, header },
 *               problemLabels, problemStyles, detailRoute }`
 */
export default function ReturnTable({ config, ...tableProps }) {
  const columns = useMemo(() => columnsFor(config), [config]);
  return <DataTable {...tableProps} columns={columns} emptyState={EMPTY_STATE} />;
}
