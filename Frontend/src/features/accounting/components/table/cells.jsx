import { Link } from "react-router-dom";

import StatusBadge from "@/shared/components/status/StatusBadge";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatDigits } from "@/shared/lib/numberFormat";
import {
  ACCOUNTING_PARTY_TYPE_LABELS,
  ACCOUNTING_PARTY_TYPE_TONES,
  AccountingPartyTypeEnum,
} from "../../domain/accountingEnums";

/**
 * خانه‌های مشترکِ جدول‌های حسابداری. هر خانه‌ای که به سند یا طرف‌حساب اشاره می‌کند یک
 * **لینکِ واقعی** است (Ctrl+کلیک در تبِ جدید)، نه `onClick`.
 */

const PARTY_ROUTES = {
  [AccountingPartyTypeEnum.CUSTOMER]: ROUTES.CUSTOMERS_DETAIL,
  [AccountingPartyTypeEnum.SUPPLIER]: ROUTES.SUPPLIERS_DETAIL,
};

/** نامِ طرف‌حساب با لینک به صفحه‌ی مشتری/تامین‌کننده. */
export function PartyLink({ partyType, partyId, name, route }) {
  const pattern = route ?? PARTY_ROUTES[partyType];
  if (!partyId || !pattern) return <span>{name || "—"}</span>;
  return (
    <Link to={routeWithId(pattern, partyId)} className="font-medium hover:text-primary hover:underline">
      {name || "بدون نام"}
    </Link>
  );
}

export function PartyTypeBadge({ partyType }) {
  return (
    <StatusBadge tone={ACCOUNTING_PARTY_TYPE_TONES[partyType]} size="sm">
      {ACCOUNTING_PARTY_TYPE_LABELS[partyType] ?? partyType}
    </StatusBadge>
  );
}

/** شماره‌ی فاکتور با لینک به سندِ فروش یا خرید؛ بدونِ سند خط تیره. */
export function InvoiceLink({ saleId, purchaseId, invoiceNumber }) {
  const id = saleId ?? purchaseId;
  if (!id) return <span className="text-muted-foreground">—</span>;
  const route = saleId ? ROUTES.SALES_DETAIL : ROUTES.PURCHASES_DETAIL;
  return (
    <Link to={routeWithId(route, id)} className="font-mono text-xs text-primary hover:underline">
      {invoiceNumber || `#${formatDigits(id)}`}
    </Link>
  );
}

export function DateCell({ value }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return <span className="whitespace-nowrap text-xs tabular-nums">{gregorianToPersian(value)}</span>;
}
