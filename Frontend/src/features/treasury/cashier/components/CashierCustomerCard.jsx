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
import { InfoList, InfoRow } from "@/shared/components/data/InfoList";

/**
 * مشتریِ پیش‌فاکتور برای صندوقدار: تماس، مانده‌ی حساب و سقفِ اعتبار — تا بداند نسیه بدهد یا نه و چقدر
 * پیش‌پرداخت بگیرد. بی دسترسیِ `CustomerView` فقط نام (از خودِ فروش) نشان داده می‌شود.
 *
 * @param saleTotal جمعِ همین پیش‌فاکتور (برای «اعتبارِ مانده پس از این فروش»)
 */
export default function CashierCustomerCard({ customerId, customerName, saleTotal }) {
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
  // ستونِ کناری باریک است: ردیفِ «برچسب / مقدار».

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

      <InfoList className="space-y-0 divide-y rounded-lg bg-muted/50 px-3 text-sm [&>div]:items-center [&>div]:py-2 [&_dt]:text-xs">
        <InfoRow label="مانده‌ی حساب" value={<LedgerBalanceBadge balance={balance} />} />
        <InfoRow
          label="سقفِ اعتبار"
          value={creditLimit > 0 ? formatRial(creditLimit) : "تعریف نشده"}
          valueClassName="font-medium"
        />
        <InfoRow
          label="اعتبارِ مانده پس از فروش"
          value={creditLeft == null ? "—" : formatRial(creditLeft)}
          valueClassName={
            creditLeft == null ? "text-muted-foreground" : creditLeft < 0 ? "font-medium text-destructive" : "font-medium"
          }
        />
      </InfoList>

      {creditLeft != null && creditLeft < 0 && (
        <Notice tone="caution">اگر این فروش نسیه بماند، از سقفِ اعتبارِ مشتری بیشتر می‌شود؛ بخشی را نقد بگیرید.</Notice>
      )}
      {customer.description && <p className="text-xs leading-6 text-muted-foreground">{customer.description}</p>}
    </SectionCard>
  );
}
