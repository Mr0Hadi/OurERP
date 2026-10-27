import { Link } from "react-router-dom";

import DataTable from "@/shared/components/table/DataTable";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import SupplierSelect from "@/features/suppliers/components/SupplierSelect";
import SelectCheckbox from "@/shared/components/forms/SelectCheckbox";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";

const MAX_QUANTITY = 1_000_000_000;

/**
 * ستون‌ها به پیش‌نویسِ خریدار (`draft`) وابسته‌اند، پس در هر رندر ساخته می‌شوند.
 * چک‌باکس در دسکتاپ زیرِ دکمه‌ی تازه‌سازی در ستونِ گوشه است (`corner`) و در موبایل کنارِ عنوانِ کارت (`leading`)،
 * مثلِ صفحه‌ی دانه‌ها؛ «تعداد» با سرتیترِ تابعی به فوترِ کارتِ موبایل می‌رود.
 */
function buildColumns({ draft, editable }) {
  const columns = [];

  if (editable) {
    columns.push({
      id: "select",
      header: () => <span className="sr-only">انتخاب</span>,
      enableSorting: false,
      meta: { mobile: "leading", corner: true },
      cell: ({ row }) => {
        const s = row.original;
        const { selected } = draft.lineOf(s);
        return (
          <SelectCheckbox
            checked={selected}
            onChange={() => draft.update(s.productId, { selected: !selected })}
            label={`انتخابِ ${s.productName}`}
          />
        );
      },
    });
  }

  columns.push(
    {
      accessorKey: "productName",
      header: "کالا",
      meta: { mobile: "title" },
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="max-w-64 text-right">
            <Link
              to={routeWithId(ROUTES.WAREHOUSE_PRODUCTS_DETAIL, s.productId)}
              className="block truncate font-medium hover:text-primary hover:underline"
            >
              {s.productName}
            </Link>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {[s.productCode, s.brand].filter(Boolean).join(" · ")}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "supplierName",
      header: "تامین‌کننده",
      cell: ({ row }) => {
        const s = row.original;
        if (s.supplierId != null) return <span className="text-sm">{s.supplierName}</span>;
        const line = draft.lineOf(s);
        // انتخابگر فقط برای ردیفِ تیک‌خورده؛ وگرنه هر ردیفِ بی‌تامین‌کننده یک انتخابگرِ اضافه داشت.
        if (!editable || !line.selected) return <span className="text-xs text-muted-foreground">ندارد</span>;
        return (
          <div className="min-w-40 text-right">
            <SupplierSelect
              value={line.supplierId}
              onChange={(id) => draft.update(s.productId, { supplierId: id === "" ? null : id })}
            />
          </div>
        );
      },
    },
    {
      accessorKey: "stock",
      header: "موجودی",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatNumber(row.original.stock)}
          <span className="text-xs text-muted-foreground"> از {formatNumber(row.original.reorderPoint)}</span>
        </span>
      ),
    },
    {
      accessorKey: "onOrder",
      header: "در راه",
      cell: (info) => <span className="tabular-nums">{formatNumber(info.getValue())}</span>,
    },
    {
      accessorKey: "lastUnitPrice",
      header: "آخرین قیمت",
      cell: (info) => <span className="tabular-nums">{formatNumber(info.getValue())}</span>,
    },
    {
      id: "quantity",
      header: () => "تعداد",
      enableSorting: false,
      cell: ({ row }) => {
        const s = row.original;
        const line = draft.lineOf(s);
        if (!editable) return <span className="tabular-nums">{formatNumber(line.quantity)}</span>;
        return (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground md:hidden">تعداد</span>
            <QuantityStepper
              value={line.quantity}
              min={1}
              max={MAX_QUANTITY}
              onChange={(quantity) => draft.update(s.productId, { quantity: Math.floor(quantity) })}
            />
          </div>
        );
      },
    },
  );

  return columns;
}

/**
 * جدولِ پیشنهادِ خرید روی `DataTable` (مرتب‌سازی، صفحه‌بندی، تازه‌سازی و کارتِ موبایل مثلِ بقیه‌ی فهرست‌ها).
 * propsِ `DataTable` از `ServerTable` می‌رسد؛ `draft` و تامین‌کننده‌ها از صفحه.
 */
export default function ReorderTable({ draft, editable, ...props }) {
  return (
    <DataTable
      columns={buildColumns({ draft, editable })}
      getRowKey={(row) => row.original.productId}
      rowClassName={(row) => (draft.lineOf(row.original).selected ? "border-primary/40 bg-primary/5" : "")}
      emptyMessage="کالایی یافت نشد."
      {...props}
    />
  );
}
