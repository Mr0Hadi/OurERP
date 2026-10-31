import { flexRender } from "@tanstack/react-table";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/shared/lib/utils";
import RefreshButton from "./RefreshButton";
import SortSelect from "./SortSelect";

/** ستون‌هایی که برچسبِ متنی ندارند (جزئیات، دکمه‌ها) در پایینِ کارت می‌نشینند. */
const isActionColumn = (column) =>
  column.id === "actions" || typeof column.columnDef.header !== "string";

const slotOf = (column) => column.columnDef.meta?.mobile;
const render = (cell) => flexRender(cell.column.columnDef.cell, cell.getContext());

/**
 * مرتب‌سازیِ موبایل از روی ستون‌های جدول.
 *
 * `sorting` جدا از `table` می‌آید: نمونه‌ی `useReactTable` در همه‌ی رندرها همان شیء
 * است و React Compiler این کامپوننت را با همان `table` دوباره رندر نمی‌کرد؛ خواندنِ
 * `table.getState().sorting` همیشه مقدارِ اولیه را نشان می‌داد و انتخاب «پیش‌فرض» می‌ماند.
 */
function MobileSortSelect({ table, sorting }) {
  const options = table
    .getAllLeafColumns()
    .filter((c) => c.getCanSort() && !isActionColumn(c))
    .map((c) => ({ id: c.id, label: c.columnDef.header }));

  return (
    <SortSelect
      options={options}
      sorting={sorting[0] ?? null}
      onChange={(next) => table.setSorting(next ? [next] : [])}
    />
  );
}

function RowCard({ row, rowClassName }) {
  const cells = row.getVisibleCells().filter((cell) => slotOf(cell.column) !== "hidden");

  // ستونِ «جزئیات» (`detailsColumn`) کلِ کارت را لینک می‌کند به‌جای یک دکمه‌ی جدا.
  const linkCell = cells.find((cell) => cell.column.columnDef.meta?.rowLink);
  const to = linkCell?.column.columnDef.meta.rowLink(row.original);

  // «leading» (مثلاً چک‌باکسِ انتخاب) کنارِ عنوان می‌نشیند، مثلِ کارتِ دانه‌ها؛ نه در فوتر.
  const leading = cells.filter((cell) => slotOf(cell.column) === "leading");
  const actions = cells.filter(
    (cell) => isActionColumn(cell.column) && cell !== linkCell && !leading.includes(cell),
  );
  const fields = cells.filter((cell) => !isActionColumn(cell.column) && !leading.includes(cell));

  const bySlot = (slot) => fields.filter((cell) => slotOf(cell.column) === slot);
  let [title] = bySlot("title");
  const subtitles = bySlot("subtitle");
  const badges = bySlot("badge");
  const highlights = bySlot("highlight");
  // جدولی که ستونِ عنوان تعیین نکرده: ستونِ اول عنوان است.
  if (!title) title = fields.find((cell) => !slotOf(cell.column));
  const details = fields.filter((cell) => cell !== title && !slotOf(cell.column));

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        {leading.map((cell) => (
          <div key={cell.id} className="-ms-1 -mt-1 shrink-0">
            {render(cell)}
          </div>
        ))}
        <div className="min-w-0 flex-1 space-y-0.5 [&_*]:justify-start [&_*]:text-start">
          {title && <div className="truncate text-sm font-semibold">{render(title)}</div>}
          {subtitles.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {subtitles.map((cell, i) => (
                <span key={cell.id} className="inline-flex items-center gap-2">
                  {i > 0 && <span aria-hidden>·</span>}
                  {render(cell)}
                </span>
              ))}
            </div>
          )}
        </div>
        {badges.length > 0 && (
          <div className="flex shrink-0 flex-col items-end gap-1 [&_*]:justify-end">
            {badges.map((cell) => (
              <div key={cell.id}>{render(cell)}</div>
            ))}
          </div>
        )}
        {to && <ChevronLeft className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      </div>

      {details.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          {details.map((cell) => (
            <div key={cell.id} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{cell.column.columnDef.header}</dt>
              <dd className="truncate [&_*]:justify-start [&_*]:text-start">{render(cell)}</dd>
            </div>
          ))}
        </dl>
      )}

      {highlights.length > 0 && (
        <div className="mt-3 space-y-1 rounded-lg bg-muted/50 px-3 py-2">
          {highlights.map((cell) => (
            <div key={cell.id} className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{cell.column.columnDef.header}</span>
              <span className="text-sm font-semibold">{render(cell)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <li className={cn("overflow-hidden rounded-xl border bg-card shadow-xs", rowClassName?.(row))}>
      {to ? (
        <Link to={to} className="block p-3 transition-colors active:bg-muted/60">
          {body}
        </Link>
      ) : (
        <div className="p-3">{body}</div>
      )}
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/20 px-3 py-2">
          {actions.map((cell) => (
            <div key={cell.id}>{render(cell)}</div>
          ))}
        </div>
      )}
    </li>
  );
}

/**
 * نمایشِ کارتیِ ردیف‌های `DataTable` در موبایل.
 *
 * چیدمان با `meta.mobile`ِ ستون تعیین می‌شود:
 *   "title"     عنوانِ کارت (پیش‌فرض: ستونِ اول)
 *   "subtitle"  خطِ کم‌رنگِ زیرِ عنوان، بدونِ برچسب (کد، شماره، تاریخ)
 *   "badge"     گوشه‌ی کارت (وضعیت، موجودی)
 *   "highlight" عددِ اصلی در نوارِ پایینِ کارت (مبلغ، مانده)
 *   "leading"   کنارِ عنوان، پیش از آن (چک‌باکسِ انتخاب)
 *   "hidden"    در کارت نمی‌آید
 * بقیه‌ی ستون‌ها شبکه‌ی دوستونه‌ی «برچسب/مقدار» می‌شوند؛ `detailsColumn` کلِ کارت را لینک
 * می‌کند و ستون‌های بی‌برچسبِ دیگر (دکمه‌ها) فوترِ کارت‌اند.
 */
export default function MobileRowCards({ table, sorting, rows, emptyMessage, rowClassName, getRowKey, totalCount, refresh }) {
  return (
    <div className="space-y-2">
      <div className="flex min-h-8 items-center justify-between gap-2">
        {totalCount != null ? (
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {totalCount.toLocaleString("fa-IR")}
            </span>{" "}
            مورد
          </span>
        ) : (
          <span />
        )}
        <div className="flex min-w-0 max-w-[75%] items-center justify-end gap-1.5">
          <MobileSortSelect table={table} sorting={sorting} />
          {refresh && <RefreshButton query={refresh} variant="pill" />}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <RowCard key={getRowKey ? getRowKey(row) : row.id} row={row} rowClassName={rowClassName} />
          ))}
        </ul>
      )}
    </div>
  );
}
