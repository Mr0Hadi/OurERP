// src/features/reports/pages/SupplierActivityPage.jsx
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

import ActivityReportSection from "../components/ActivityReportSection";
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
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>آمار خرید از تامین‌کنندگان</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityReportSection
            useFilterStore={useSupplierActivityFilterStore}
            useReportQuery={useSupplierSalesStatisticsQuery}
            hint="رتبه‌بندی تامین‌کنندگان بر اساس مبلغ کل خریدِ ما از آن‌ها؛ بازه روی تاریخ فاکتور اعمال می‌شود."
            nameHeader="تامین‌کننده"
            nameKey="companyName"
            countHeader="تعداد فاکتور"
            countKey="purchasesCount"
            countLabel="تعداد فاکتور"
            showPayment
            emptyMessage="در این بازه خریدی از تامین‌کنندگان ثبت نشده است."
          />
        </CardContent>
      </Card>
    </div>
  );
}
