import { Link } from "react-router-dom";

import Notice from "@/shared/components/feedback/Notice";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SALE_PROFORMA_STAGE_LABELS } from "@/shared/domain/enums/saleProforma";
import { isSaleProforma } from "@/shared/domain/enums/saleStatus";

/**
 * پیش‌فاکتوری که دیگر در مرحله‌ی این صفحه نیست (کسِ دیگری کارش را کرده، ویرایش یا صادر شده): پیام و راهِ
 * بازگشت به صف یا دیدنِ فروش. مشترکِ صفحه‌های صف‌ها (بررسیِ انبار، صندوق).
 *
 * @param purpose   این صفحه برای چه بود («در صفِ انبار»، «آماده‌ی پرداخت»)
 * @param backTo    مسیرِ صف
 * @param backLabel برچسبِ دکمه‌ی بازگشت
 */
export default function ProformaUnavailable({ sale, purpose, backTo, backLabel }) {
  const message = isSaleProforma(sale.status)
    ? `این پیش‌فاکتور دیگر ${purpose} نیست (مرحله: ${SALE_PROFORMA_STAGE_LABELS[Number(sale.proformaStage)]}). شاید کسِ دیگری کارش را کرده یا ویرایش شده است.`
    : `فاکتور ${sale.invoiceNumber || ""} صادر شده است.`;

  return (
    <div className="container mx-auto max-w-2xl space-y-3">
      <Notice tone="info">{message}</Notice>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link to={backTo}>{backLabel}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to={routeWithId(ROUTES.SALES_DETAIL, sale.id)}>دیدنِ فروش</Link>
        </Button>
      </div>
    </div>
  );
}
