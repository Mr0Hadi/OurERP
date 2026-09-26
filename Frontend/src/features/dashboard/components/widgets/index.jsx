import WelcomeWidget from "./WelcomeWidget";
import WorkQueuesWidget from "./WorkQueuesWidget";
import QuickActionsWidget from "./QuickActionsWidget";
import ScopePerformanceWidget from "./ScopePerformanceWidget";
import TopSellersWidget from "./TopSellersWidget";
import {
  OrgKpisWidget,
  OrgPeriodTableWidget,
  OrgRevenueBreakdownWidget,
  OrgSalesTrendWidget,
  OrgSalesVsPurchaseWidget,
} from "./OrgWidgets";
import { ReportScopeEnum } from "../../domain/dashboardContext";

/**
 * شناسه‌ی ویجت → کامپوننت. تعریفِ ویجت (عنوان، شرطِ نمایش، عرض) در
 * `domain/widgetRegistry.js` است و این‌جا فقط رندر؛ پنلِ شخصی‌سازی بدونِ
 * بارکردنِ هیچ نموداری از همان تعریف‌ها می‌خواند.
 *
 * همه یک امضا دارند: `{ context, params, action }`.
 */
export const WIDGET_COMPONENTS = {
  welcome: WelcomeWidget,
  workQueues: WorkQueuesWidget,
  quickActions: QuickActionsWidget,
  myPerformance: (props) => (
    <ScopePerformanceWidget {...props} scope={ReportScopeEnum.ME} />
  ),
  teamPerformance: (props) => (
    <ScopePerformanceWidget {...props} scope={ReportScopeEnum.TEAM} />
  ),
  departmentPerformance: (props) => (
    <ScopePerformanceWidget {...props} scope={ReportScopeEnum.DEPARTMENT} />
  ),
  orgKpis: OrgKpisWidget,
  orgSalesVsPurchase: OrgSalesVsPurchaseWidget,
  orgRevenueBreakdown: OrgRevenueBreakdownWidget,
  orgSalesTrend: OrgSalesTrendWidget,
  orgPeriodTable: OrgPeriodTableWidget,
  topSellers: TopSellersWidget,
};
