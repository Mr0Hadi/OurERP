// src/features/reports/pages/EmployeeActivityPage.jsx
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

import ActivityReportSection from "../components/ActivityReportSection";
import { useEmployeeActivityFilterStore } from "../store/activityFilterStore";
import {
  useSalesPerformanceByEmployeeQuery,
  useSupplyPerformanceByEmployeeQuery,
} from "../services/queries";

/**
 * میزانِ فعالیتِ کارمندان — دو رتبه‌بندی روی یک صفحه:
 *
 *  - **فروش**: از `Sale.SalesUserId` که هنگام `CreateSale` از کاربرِ
 *    واردشده پر می‌شود.
 *  - **تأمین/خرید**: از `Purchase.PurchasingUserId` هنگام `CreatePurchase`.
 *
 * دو تب و نه دو کارتِ کنارِ هم: هر دو جدولِ کاملِ صفحه‌بندی‌شده‌اند و
 * کنارِ هم روی موبایل به دو ستونِ باریک تبدیل می‌شدند.
 *
 * هر دو تب یک استورِ بازه دارند، پس تاریخی که کاربر انتخاب می‌کند با
 * جابه‌جایی بین تب‌ها از دست نمی‌رود.
 */
export default function EmployeeActivityPage() {
  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>فعالیت کارمندان</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sales" className="gap-4">
            <TabsList>
              <TabsTrigger value="sales">فروش</TabsTrigger>
              <TabsTrigger value="supply">خرید و تأمین</TabsTrigger>
            </TabsList>

            <TabsContent value="sales">
              <ActivityReportSection
                useFilterStore={useEmployeeActivityFilterStore}
                useReportQuery={useSalesPerformanceByEmployeeQuery}
                hint="رتبه‌بندی کارمندان بر اساس فروش‌هایی که خودشان ثبت کرده‌اند؛ بازه روی تاریخ فاکتور اعمال می‌شود."
                nameHeader="کارمند"
                countHeader="تعداد فروش"
                countKey="salesCount"
                countLabel="تعداد فروش"
                amountHeader="مبلغ کل فروش (ریال)"
                emptyMessage="در این بازه فروشی ثبت نشده است."
              />
            </TabsContent>

            <TabsContent value="supply">
              <ActivityReportSection
                useFilterStore={useEmployeeActivityFilterStore}
                useReportQuery={useSupplyPerformanceByEmployeeQuery}
                hint="رتبه‌بندی کارمندان بر اساس خریدهایی که خودشان ثبت کرده‌اند؛ بازه روی تاریخ فاکتور اعمال می‌شود."
                nameHeader="کارمند"
                countHeader="تعداد خرید"
                countKey="purchasesCount"
                countLabel="تعداد خرید"
                amountHeader="مبلغ کل خرید (ریال)"
                emptyMessage="در این بازه خریدی ثبت نشده است."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
