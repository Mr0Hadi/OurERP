import { X } from "lucide-react";

import { getPartyName } from "@/shared/components/filters/filterUtils";
import { UNIT_CUSTODY_REASON_LABELS } from "@/shared/domain/enums/unitStatus";
import { UNIT_SEGMENTS, fa, formatDate } from "../domain/unitVocabulary";

const findName = (items, id, getName = getPartyName) => {
  const item = items.find((candidate) => String(candidate.id) === String(id));
  return item ? getName(item) : `#${fa(id)}`;
};

function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/60 py-0.5 pr-2.5 pl-1 text-xs">
      <span className="truncate">{children}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
        aria-label="حذف این فیلتر"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/**
 * فیلترهای فعالی که در ردیفِ اصلی دیده نمی‌شوند، به شکلِ برچسب‌های قابلِ
 * حذف — کاربر همیشه می‌بیند چرا فهرست کوتاه شده. پیوند از خرید/فروش هم
 * اینجاست. `linksOnly` وقتی پنلِ فیلترها باز است و بقیه همان‌جا دیده می‌شوند.
 */
export default function UnitActiveFilters({ store, suppliers, customers, linksOnly = false }) {
  const range = (from, to, format = fa) => `${from ? format(from) : "…"} تا ${to ? format(to) : "…"}`;

  const chips = [
    store.purchaseId && {
      key: "purchase",
      link: true,
      label: `دانه‌های خرید #${fa(store.purchaseId)}`,
      clear: () => store.setPurchaseId(""),
    },
    store.saleId && {
      key: "sale",
      link: true,
      label: `دانه‌های فروش #${fa(store.saleId)}`,
      clear: () => store.setSaleId(""),
    },
    store.supplierId && {
      key: "supplier",
      label: `تامین‌کننده: ${findName(suppliers, store.supplierId)}`,
      clear: () => store.setSupplierId(""),
    },
    store.customerId && {
      key: "customer",
      label: `مشتری: ${findName(customers, store.customerId)}`,
      clear: () => store.setCustomerId(""),
    },
    store.segment === UNIT_SEGMENTS.QUARANTINE &&
      store.custodyReason && {
        key: "custody",
        label: `علت: ${UNIT_CUSTODY_REASON_LABELS[store.custodyReason]}`,
        clear: () => store.setCustodyReason(""),
      },
    (store.fromDate || store.toDate) && {
      key: "date",
      label: `ورود ${range(store.fromDate, store.toDate, formatDate)}`,
      clear: () => {
        store.setFromDate("");
        store.setToDate("");
      },
    },
    (store.fromSerial || store.toSerial) && {
      key: "serial",
      label: `سریال ${range(store.fromSerial, store.toSerial)}`,
      clear: () => {
        store.setFromSerial("");
        store.setToSerial("");
      },
    },
  ].filter((chip) => chip && (!linksOnly || chip.link));

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Chip key={chip.key} onRemove={chip.clear}>
          {chip.label}
        </Chip>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={store.clearAdvanced}
          className="px-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          پاک کردن همه
        </button>
      )}
    </div>
  );
}
