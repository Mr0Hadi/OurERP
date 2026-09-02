// src/features/reports/pages/CustomerActivityPage.jsx
import { Users } from "lucide-react";

import ActivityReportSection from "../components/ActivityReportSection";
import ReportPageHeader from "../components/ReportPageHeader";
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
    <div className="container mx-auto max-w-4xl space-y-4 px-2 sm:px-4">
      <ReportPageHeader
        icon={Users}
        title="آمار خرید مشتریان"
        description="رتبه‌بندی مشتریان بر اساس مبلغ کل خریدشان، همراه با مانده‌ی تسویه‌نشده. بازه روی تاریخ فاکتور اعمال می‌شود."
      />

      <ActivityReportSection
        useFilterStore={useCustomerActivityFilterStore}
        useReportQuery={useCustomerPurchaseStatisticsQuery}
        countKey="salesCount"
        countLabel="تعداد فاکتور"
        countUnit="فاکتور"
        showPayment
        emptyMessage="در این بازه فروشی به مشتریان ثبت نشده است."
      />
    </div>
  );
}
