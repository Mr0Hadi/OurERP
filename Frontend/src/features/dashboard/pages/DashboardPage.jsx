import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { useDashboardFilterStore } from "../store/dashboardFilterStore";
import { useDashboardContext } from "../hooks/useDashboardContext";
import { useDashboardLayout } from "../hooks/useDashboardLayout";
import { WIDGETS_BY_ID, packRows } from "../domain/widgetRegistry";
import { WIDGET_COMPONENTS } from "../components/widgets";
import DashboardToolbar from "../components/DashboardToolbar";
import DashboardCustomizeSheet from "../components/DashboardCustomizeSheet";

const COLUMN_CLASSES = {
  1: "xl:col-span-1",
  2: "xl:col-span-2",
  3: "xl:col-span-3",
};

/**
 * داشبوردِ شخصی — هر کاربر داشبوردِ خودش را می‌بیند.
 *
 * صفحه خودش هیچ تصمیمی نمی‌گیرد؛ سه لایه را کنارِ هم می‌گذارد:
 *   - `useDashboardContext` — نقشِ سازمانی، واحد/تیم و دسترسی‌ها؛
 *   - `useDashboardLayout`  — کدام ویجت‌ها، به چه ترتیبی (پیش‌فرضِ نقش +
 *                             انتخابِ خودِ کاربر)؛
 *   - `WIDGET_COMPONENTS`   — رندرِ هر ویجت.
 *
 * نوارِ بازه یک‌بار و بالای صفحه است، نه روی هر ویجت: «عملکرد من» و «نمای
 * کل سازمان» کنارِ هم فقط وقتی قابلِ مقایسه‌اند که بازه‌شان یکی باشد.
 * اگر هیچ ویجتِ بازه‌داری روشن نباشد، نوار هم نیست.
 *
 * `min-w-0` روی ریشه و هر خانه‌ی گرید لازم است: والدِ `<Outlet>` فلکس
 * است و بدونِ آن بازشدنِ سایدبار کلِ صفحه را افقی اسکرول می‌کرد.
 */
export default function DashboardPage() {
  const [customizing, setCustomizing] = useState(false);
  const { context, isPending } = useDashboardContext();
  const layout = useDashboardLayout(context);

  const {
    periodType,
    fromDate,
    toDate,
    setPeriodType,
    setFromDate,
    setToDate,
    resetFilters,
  } = useDashboardFilterStore();

  const params = useMemo(
    () => ({ periodType, fromDate, toDate }),
    [periodType, fromDate, toDate],
  );

  if (isPending) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const hasPeriodic = layout.visibleIds.some((id) => WIDGETS_BY_ID[id]?.periodic);

  const customizeButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setCustomizing(true)}
      className="shrink-0 gap-2 self-start sm:self-center"
    >
      <SlidersHorizontal className="size-4" />
      شخصی‌سازی
    </Button>
  );

  const WelcomeWidget = WIDGET_COMPONENTS.welcome;
  const gridIds = layout.visibleIds.filter((id) => !WIDGETS_BY_ID[id].locked);
  const columns = packRows(gridIds);

  return (
    <div className="w-full min-w-0 space-y-4">
      <WelcomeWidget context={context} action={customizeButton} />

      {/* نوارِ بازه درست زیرِ سرِ صفحه، تا معلوم باشد به همه‌ی عددهای
          زیرش مربوط است. */}
      {hasPeriodic && (
        <DashboardToolbar
          periodType={periodType}
          onPeriodTypeChange={setPeriodType}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onReset={resetFilters}
        />
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
        {gridIds.map((id) => {
          const Widget = WIDGET_COMPONENTS[id];
          if (!Widget) return null;
          return (
            <div
              key={id}
              className={cn("min-w-0", COLUMN_CLASSES[columns[id]])}
            >
              <Widget context={context} params={params} />
            </div>
          );
        })}
      </div>

      <DashboardCustomizeSheet
        open={customizing}
        onOpenChange={setCustomizing}
        layout={layout}
      />
    </div>
  );
}
