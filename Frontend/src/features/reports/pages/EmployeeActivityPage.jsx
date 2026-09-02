// src/features/reports/pages/EmployeeActivityPage.jsx
import { UserCog } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

import ActivityReportSection from "../components/ActivityReportSection";
import ReportPageHeader from "../components/ReportPageHeader";
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
 * دو تب و نه دو فهرستِ زیرِ هم: هر دو صفحه‌بندیِ مستقل دارند و پشتِ سرِ
 * هم که می‌آمدند، صفحه‌بندیِ دومی همیشه زیرِ خطِ دید بود.
 *
 * هر دو تب یک استورِ بازه دارند، پس تاریخی که کاربر انتخاب می‌کند با
 * جابه‌جایی بین تب‌ها از دست نمی‌رود.
 */
export default function EmployeeActivityPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-4 px-2 sm:px-4">
      <ReportPageHeader
        icon={UserCog}
        title="فعالیت کارمندان"
        description="رتبه‌بندی کارمندان بر اساس اسنادی که خودشان ثبت کرده‌اند. بازه روی تاریخ فاکتور اعمال می‌شود."
      />

      <Tabs defaultValue="sales" className="gap-3">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="sales" className="flex-1 sm:flex-none">
            فروش
          </TabsTrigger>
          <TabsTrigger value="supply" className="flex-1 sm:flex-none">
            خرید و تأمین
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <ActivityReportSection
            useFilterStore={useEmployeeActivityFilterStore}
            useReportQuery={useSalesPerformanceByEmployeeQuery}
            countKey="salesCount"
            countLabel="تعداد فروش"
            countUnit="فاکتور فروش"
            emptyMessage="در این بازه فروشی ثبت نشده است."
          />
        </TabsContent>

        <TabsContent value="supply">
          <ActivityReportSection
            useFilterStore={useEmployeeActivityFilterStore}
            useReportQuery={useSupplyPerformanceByEmployeeQuery}
            countKey="purchasesCount"
            countLabel="تعداد خرید"
            countUnit="فاکتور خرید"
            emptyMessage="در این بازه خریدی ثبت نشده است."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
