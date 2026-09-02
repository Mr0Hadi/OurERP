// src/features/reports/pages/SupplierActivityPage.jsx
import { Truck } from "lucide-react";

import ActivityReportSection from "../components/ActivityReportSection";
import ReportPageHeader from "../components/ReportPageHeader";
import { useSupplierActivityFilterStore } from "../store/activityFilterStore";
import { useSupplierSalesStatisticsQuery } from "../services/queries";

/**
 * آمار خرید از تامین‌کنندگان — از هرکدام چقدر خریده‌ایم و چقدرش تسویه
 * شده. نامِ endpoint سمتِ سرور `GetSupplierSalesStatistics` است («فروشِ
 * آن‌ها به ما»)، ولی از دیدِ این سیستم همان *خرید* است و عنوان‌ها هم
 * همین را می‌گویند.
 */
export default function SupplierActivityPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-4 px-2 sm:px-4">
      <ReportPageHeader
        icon={Truck}
        title="آمار خرید از تامین‌کنندگان"
        description="رتبه‌بندی تامین‌کنندگان بر اساس مبلغ کل خریدِ ما از آن‌ها، همراه با مانده‌ی پرداخت‌نشده. بازه روی تاریخ فاکتور اعمال می‌شود."
      />

      <ActivityReportSection
        useFilterStore={useSupplierActivityFilterStore}
        useReportQuery={useSupplierSalesStatisticsQuery}
        nameKey="companyName"
        countKey="purchasesCount"
        countLabel="تعداد فاکتور"
        countUnit="فاکتور"
        showPayment
        emptyMessage="در این بازه خریدی از تامین‌کنندگان ثبت نشده است."
      />
    </div>
  );
}
