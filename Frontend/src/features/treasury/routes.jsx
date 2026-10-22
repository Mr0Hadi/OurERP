import { lazy } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { ROUTES } from "@/shared/constants/routes";

const CashierQueuePage = lazy(() => import("./cashier/pages/CashierQueuePage"));
// اقساط منطقِ فروش است (`sales/installments`) ولی جای مدیریتش، کنارِ بقیه‌ی پول، خزانه‌داری است.
const InstallmentsPage = lazy(() => import("@/features/sales/installments/pages/InstallmentsPage"));

/** نشانیِ قدیمی → نشانیِ تازه، با همان پارامترها (`?view=overdue&customerId=`). */
function RedirectKeepingSearch({ to }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}

/**
 * خزانه‌داری: هرچه پول جابه‌جا می‌کند یک‌جا — صفِ صندوق و اقساط، و جای حساب‌های بانک/صندوق، دریافت و
 * پرداختِ مستقل، انتقال‌ها و چک‌ها (GAP-03).
 */
export const treasuryRoutes = [
  { path: ROUTES.TREASURY, element: <Navigate to={ROUTES.TREASURY_CASHIER} replace /> },
  { path: ROUTES.TREASURY_CASHIER, handle: { permission: "SalePayment" }, element: <CashierQueuePage /> },
  { path: ROUTES.TREASURY_INSTALLMENTS, handle: { permission: "SaleInstallmentView" }, element: <InstallmentsPage /> },
  { path: ROUTES.LEGACY_SALES_CASHIER, element: <RedirectKeepingSearch to={ROUTES.TREASURY_CASHIER} /> },
  { path: ROUTES.LEGACY_SALES_INSTALLMENTS, element: <RedirectKeepingSearch to={ROUTES.TREASURY_INSTALLMENTS} /> },
];
