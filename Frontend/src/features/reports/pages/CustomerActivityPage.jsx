// src/features/reports/pages/CustomerActivityPage.jsx
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

import ActivityReportSection from "../components/ActivityReportSection";
import { useCustomerActivityFilterStore } from "../store/activityFilterStore";
import { useCustomerPurchaseStatisticsQuery } from "../services/queries";

/**
 * آمار خرید مشتریان — چه کسی چقدر خریده و چقدرش را پرداخت کرده.
 *
 * ستونِ پرداخت به‌جای یک «مبلغ کل»ِ تنها می‌آید، چون سرور
 * `totalPaidAmount` را هم می‌دهد و همان چیزی است که کاربرِ فروش دنبالش
 * است: مشتریِ پرخرید که تسویه نکرده.
 */
export default function CustomerActivityPage() {
  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>آمار خرید مشتریان</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityReportSection
            useFilterStore={useCustomerActivityFilterStore}
            useReportQuery={useCustomerPurchaseStatisticsQuery}
            hint="رتبه‌بندی مشتریان بر اساس مبلغ کل خریدشان؛ بازه روی تاریخ فاکتور اعمال می‌شود."
            nameHeader="مشتری"
            countHeader="تعداد فاکتور"
            countKey="salesCount"
            countLabel="تعداد فاکتور"
            showPayment
            emptyMessage="در این بازه فروشی به مشتریان ثبت نشده است."
          />
        </CardContent>
      </Card>
    </div>
  );
}
