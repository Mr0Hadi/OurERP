import { ExternalLink, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

import { usePermission } from "@/features/auth/hooks/usePermission";
import { useCustomerQuery } from "@/features/customers/services/queries";
import LedgerBalanceBadge from "@/features/partyAccount/components/LedgerBalanceBadge";
import { partyBalanceOf } from "@/features/partyAccount/domain/partyBalance";
import Notice from "@/shared/components/feedback/Notice";
import SectionCard from "@/shared/components/forms/SectionCard";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * مشتریِ پیش‌فاکتور برای صندوقدار: تماس، مانده‌ی حساب و سقفِ اعتبار — تا بداند نسیه بدهد یا نه و چقدر
 * پیش‌پرداخت بگیرد. بی دسترسیِ `CustomerView` فقط نام (از خودِ فروش) نشان داده می‌شود.
 *
 * @param saleTotal جمعِ همین پیش‌فاکتور (برای «اعتبارِ مانده پس از این فروش»)
 * @param compact   برای ستونِ کناری: عددها ردیفِ «برچسب / مقدار» به‌جای سه خانه‌ی کنارِ هم
 */
export default function CashierCustomerCard({ customerId, customerName, saleTotal, compact = false }) {
  const { allows } = usePermission();
  const canView = allows("CustomerView");
  const { data: customer, isLoading } = useCustomerQuery(canView ? customerId : null);

  const action = canView && (
    <Button asChild variant="ghost" size="sm" className="gap-1.5">
      <Link to={routeWithId(ROUTES.CUSTOMERS_DETAIL, customerId)}>
        <ExternalLink className="size-3.5" />
        پرونده
      </Link>
    </Button>
  );

  if (canView && isLoading) {
    return (
      <SectionCard title={customerName}>
        <Skeleton className="h-16 w-full" />
      </SectionCard>
    );
  }

  if (!customer) {
    return (
      <SectionCard title={customerName} description="مشتری">
        <p className="text-xs text-muted-foreground">اطلاعاتِ حسابِ مشتری دسترسیِ «مشاهده‌ی مشتری» می‌خواهد.</p>
      </SectionCard>
    );
  }

  const balance = partyBalanceOf(customer);
  const creditLimit = Number(customer.creditLimit) || 0;
  // اعتبارِ مانده اگر همین فروش کامل نسیه بماند.
  const creditLeft = creditLimit > 0 ? creditLimit - Math.max(0, balance) - (Number(saleTotal) || 0) : null;
  const place = [customer.province, customer.city].filter(Boolean).join("، ");
  const itemClass = compact
    ? "flex items-center justify-between gap-3 py-2"
    : "space-y-1 rounded-lg bg-muted/50 p-2.5";

  return (
    <SectionCard title={customerName} description="مشتری" action={action}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {customer.phoneNumber && (
          <a href={`tel:${customer.phoneNumber}`} className="flex items-center gap-1.5 hover:underline" dir="ltr">
            <Phone className="size-3.5 text-muted-foreground" />
            {customer.phoneNumber}
          </a>
        )}
        {place && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-3.5" />
            {place}
          </span>
        )}
      </div>

      <dl
        className={
          compact ? "divide-y rounded-lg bg-muted/50 px-3 text-sm" : "grid grid-cols-1 gap-2 text-sm sm:grid-cols-3"
        }
      >
        <div className={itemClass}>
          <dt className="text-xs text-muted-foreground">مانده‌ی حساب</dt>
          <dd>
            <LedgerBalanceBadge balance={balance} />
          </dd>
        </div>
        <div className={itemClass}>
          <dt className="text-xs text-muted-foreground">سقفِ اعتبار</dt>
          <dd className="font-medium tabular-nums">{creditLimit > 0 ? formatRial(creditLimit) : "تعریف نشده"}</dd>
        </div>
        <div className={itemClass}>
          <dt className="text-xs text-muted-foreground">{compact ? "اعتبارِ مانده پس از فروش" : "اعتبارِ مانده پس از این فروش"}</dt>
          <dd
            className={
              creditLeft == null ? "text-muted-foreground" : creditLeft < 0 ? "font-medium text-destructive" : "font-medium"
            }
          >
            {creditLeft == null ? "—" : formatRial(creditLeft)}
          </dd>
        </div>
      </dl>

      {creditLeft != null && creditLeft < 0 && (
        <Notice tone="caution">اگر این فروش نسیه بماند، از سقفِ اعتبارِ مشتری بیشتر می‌شود؛ بخشی را نقد بگیرید.</Notice>
      )}
      {customer.description && <p className="text-xs leading-6 text-muted-foreground">{customer.description}</p>}
    </SectionCard>
  );
}
