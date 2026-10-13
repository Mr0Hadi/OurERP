import { Users } from "lucide-react";

import ActivityReportSection from "../components/ActivityReportSection";
import AccountingPageLayout from "../../components/AccountingPageLayout";
import { useCustomerActivityFilterStore } from "../store/activityFilterStore";
import { useCustomerPurchaseStatisticsQuery } from "../services/queries";

/**
 * آمار خرید مشتریان — چه کسی چقدر خریده و چقدرش را پرداخت کرده.
 *
 * نوارِ هر ردیف نسبتِ *پرداخت‌شده به کل* را نشان می‌دهد، نه سهم از جمع:
 * ترتیبِ ردیف‌ها خودش سهم را می‌گوید، و سوالِ بعدیِ کاربرِ فروش همیشه
 * «چقدر مانده» است.
 */
export default function CustomerActivityPage() {
  return (
    <AccountingPageLayout
      icon={Users}
      title="آمار خرید مشتریان"
      description="رتبه‌بندی مشتریان بر اساس مبلغ کل خریدشان، همراه با مانده‌ی تسویه‌نشده. بازه روی تاریخ فاکتور اعمال می‌شود."
    >
      <ActivityReportSection
        useFilterStore={useCustomerActivityFilterStore}
        useReportQuery={useCustomerPurchaseStatisticsQuery}
        countKey="salesCount"
        countLabel="تعداد فاکتور"
        countUnit="فاکتور"
        showPayment
        emptyMessage="در این بازه فروشی به مشتریان ثبت نشده است."
      />
    </AccountingPageLayout>
  );
}
