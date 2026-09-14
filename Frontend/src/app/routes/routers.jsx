import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";
import { protectedLoader } from "./protectedLoader";
import NotFoundPage from "../layouts/NotFoundPage";

import { authRoutes } from "@/features/auth/routes";
import { dashboardRoutes } from "@/features/dashboard/routes";
import { customersRoutes } from "@/features/customers/routes";
import { warehouseRoutes } from "@/features/warehouse/routes";
import { invoiceRoutes } from "@/features/invoice/routes";
import { suppliersRoutes } from "@/features/suppliers/routes";
import { reportsRoutes } from "@/features/reports/routes";
import { settingsRoutes } from "@/features/settings/routes";
import { transactionsRoutes } from "@/features/transactions/routes";
import { purchasesRoutes } from "@/features/purchases/routes";
import { salesRoutes } from "@/features/sales/routes";
import { employeesRoutes } from "@/features/employees/routes";
import { organizationRoutes } from "@/features/organization/routes";
import { notifyNavigationStart } from "@/shared/lib/routeTransitionBus";

export const router = createBrowserRouter([
  {
    path: ROUTES.AUTH,
    element: <AuthLayout />,
    children: authRoutes,
  },
  {
    path: ROUTES.ROOT,
    element: <AppLayout />,
    loader: protectedLoader,
    errorElement: <NotFoundPage />,
    children: [
      ...dashboardRoutes,
      ...customersRoutes,
      ...employeesRoutes,
      ...organizationRoutes,
      ...purchasesRoutes,
      ...warehouseRoutes,
      ...invoiceRoutes,
      ...salesRoutes,
      ...suppliersRoutes,
      ...reportsRoutes,
      ...settingsRoutes,
      ...transactionsRoutes,
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

// `<Link>` و `useNavigate()` هر دو در نهایت همین متد را صدا می‌زنند؛ پَچ‌کردنش
// یعنی لحظه‌ی *کلیک* را داریم، نه لحظه‌ای که آدرس عوض شده و صفحه‌ی جدید
// می‌آید — دقیقاً همان چیزی که برای جلوگیری از چندبار کلیک لازم است.
//
// اگر مقصد همان مسیرِ فعلی باشد (کلیک روی آیتمِ فعالِ سایدبار، یا هر
// لینکی که به صفحه‌ی جاری برمی‌گردد) اصلاً چیزی عوض نمی‌شود، پس نباید
// اسپینر نشان داده شود — چون هیچ‌وقت هم `location.pathname` تغییر
// نمی‌کند که خاموشش کند و فقط تا سقفِ ایمنی روی صفحه می‌ماند.
function resolveTargetPathname(to) {
  if (typeof to === "string") return to.split("?")[0].split("#")[0];
  if (to && typeof to === "object" && typeof to.pathname === "string") {
    return to.pathname;
  }
  return null;
}

const originalNavigate = router.navigate.bind(router);
router.navigate = (to, options) => {
  const targetPathname = resolveTargetPathname(to);
  const currentPathname = router.state.location.pathname;

  if (targetPathname === null || targetPathname !== currentPathname) {
    notifyNavigationStart();
  }

  return originalNavigate(to, options);
};