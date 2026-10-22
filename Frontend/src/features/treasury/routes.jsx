import { lazy } from "react";
import { Navigate } from "react-router-dom";

import RedirectKeepingSearch from "@/shared/components/layout/RedirectKeepingSearch";

import { ROUTES } from "@/shared/constants/routes";

const CashierQueuePage = lazy(() => import("./cashier/pages/CashierQueuePage"));
const CashierPaymentPage = lazy(() => import("./cashier/pages/CashierPaymentPage"));
const BankAccountsPage = lazy(() => import("./bankAccounts/pages/BankAccountsPage"));
const PartyPaymentsPage = lazy(() => import("./partyPayments/pages/PartyPaymentsPage"));
const PartyPaymentDetailPage = lazy(() => import("./partyPayments/pages/PartyPaymentDetailPage"));
const ChequesPage = lazy(() => import("./cheques/pages/ChequesPage"));
// اقساط منطقِ فروش است (`sales/installments`) ولی جای مدیریتش، کنارِ بقیه‌ی پول، خزانه‌داری است.
const InstallmentsPage = lazy(() => import("@/features/sales/installments/pages/InstallmentsPage"));

const bankAccountPermission = ["BankAccountView", "BankAccountManage"];
const partyPaymentPermission = ["PartyStatementView", "PartyPaymentCreate"];

/**
 * خزانه‌داری: هرچه پول جابه‌جا می‌کند یک‌جا — صفِ صندوق، اقساط، صندوق و بانک، علی‌الحساب و چک‌ها (GAP-03).
 */
export const treasuryRoutes = [
  { path: ROUTES.TREASURY, element: <Navigate to={ROUTES.TREASURY_CASHIER} replace /> },
  { path: ROUTES.TREASURY_CASHIER, handle: { permission: "SalePayment" }, element: <CashierQueuePage /> },
  { path: ROUTES.TREASURY_CASHIER_DETAIL, handle: { permission: "SalePayment" }, element: <CashierPaymentPage /> },
  { path: ROUTES.TREASURY_INSTALLMENTS, handle: { permission: "SaleInstallmentView" }, element: <InstallmentsPage /> },
  { path: ROUTES.TREASURY_ACCOUNTS, handle: { permission: bankAccountPermission }, element: <BankAccountsPage /> },
  { path: ROUTES.TREASURY_ACCOUNTS_DETAIL, handle: { permission: bankAccountPermission }, element: <BankAccountsPage /> },
  { path: ROUTES.TREASURY_PARTY_PAYMENTS, handle: { permission: partyPaymentPermission }, element: <PartyPaymentsPage /> },
  { path: ROUTES.TREASURY_PARTY_PAYMENTS_DETAIL, handle: { permission: partyPaymentPermission }, element: <PartyPaymentDetailPage /> },
  { path: ROUTES.TREASURY_CHEQUES, handle: { permission: ["CheckView", "CheckManage"] }, element: <ChequesPage /> },
  { path: ROUTES.LEGACY_SALES_CASHIER, element: <RedirectKeepingSearch to={ROUTES.TREASURY_CASHIER} /> },
  { path: ROUTES.LEGACY_SALES_INSTALLMENTS, element: <RedirectKeepingSearch to={ROUTES.TREASURY_INSTALLMENTS} /> },
];
