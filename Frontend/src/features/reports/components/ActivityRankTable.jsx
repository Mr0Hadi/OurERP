// src/features/reports/components/ActivityRankTable.jsx
import { useMemo } from "react";

import DataTable from "@/shared/components/table/DataTable";
import PaymentProgress from "@/shared/components/table/PaymentProgress";
import { formatNumber } from "@/shared/components/charts/chartUtils";

/**
 * جدولِ مشترکِ هر چهار گزارشِ فعالیت: رتبه، نام، تعداد سند، مبلغ کل و
 * (برای مشتری/تامین‌کننده) وضعیت تسویه.
 *
 * یک کامپوننت برای هر چهار صفحه، چون تفاوتشان فقط سه چیز است: عنوانِ
 * ستونِ نام، عنوان و کلیدِ ستونِ تعداد، و بودن یا نبودنِ ستونِ پرداخت.
 * چهار جدولِ جدا یعنی چهار جای متفاوت برای درست‌کردنِ یک باگِ چیدمان.
 *
 * ستونِ «رتبه» از روی شماره‌ی صفحه حساب می‌شود نه ایندکسِ ردیف: صفحه‌ی
 * دوم باید از ۱۱ شروع شود، نه دوباره از ۱.
 *
 * مرتب‌سازی خاموش است (`sortable={false}`) — سرور همیشه نزولی بر اساس
 * مبلغ کل می‌دهد و پارامترِ مرتب‌سازی ندارد.
 */
export default function ActivityRankTable({
  data,
  isLoading,
  totalPages,
  currentPage,
  pageSize,
  onPaginationChange,
  nameHeader,
  nameKey = "fullName",
  countHeader,
  countKey,
  amountHeader = "مبلغ کل (ریال)",
  showPayment = false,
  emptyMessage,
}) {
  const columns = useMemo(() => {
    const base = [
      {
        id: "rank",
        header: "رتبه",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {formatNumber(currentPage * pageSize + row.index + 1)}
          </span>
        ),
      },
      {
        accessorKey: nameKey,
        header: nameHeader,
        enableSorting: false,
        cell: (info) => (
          <span className="font-medium">{info.getValue() || "—"}</span>
        ),
      },
      {
        accessorKey: countKey,
        header: countHeader,
        enableSorting: false,
        cell: (info) => (
          <span className="tabular-nums text-sm">
            {formatNumber(info.getValue() ?? 0)}
          </span>
        ),
      },
    ];

    if (showPayment) {
      base.push({
        accessorKey: "totalInvoiceAmount",
        header: "پرداخت‌شده از کل (ریال)",
        enableSorting: false,
        cell: ({ row }) => (
          <PaymentProgress
            paid={row.original.totalPaidAmount ?? 0}
            total={row.original.totalInvoiceAmount ?? 0}
          />
        ),
      });
    } else {
      base.push({
        accessorKey: "totalInvoiceAmount",
        header: amountHeader,
        enableSorting: false,
        cell: (info) => (
          <span className="tabular-nums text-sm font-medium">
            {formatNumber(info.getValue() ?? 0)}
          </span>
        ),
      });
    }

    return base;
  }, [
    amountHeader,
    countHeader,
    countKey,
    currentPage,
    nameHeader,
    nameKey,
    pageSize,
    showPayment,
  ]);

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      totalPages={totalPages}
      currentPage={currentPage}
      pageSize={pageSize}
      onPaginationChange={onPaginationChange}
      sorting={null}
      onSortingChange={() => {}}
      sortable={false}
      emptyMessage={emptyMessage}
    />
  );
}
