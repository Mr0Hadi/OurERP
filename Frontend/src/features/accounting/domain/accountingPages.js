import {
  ArrowLeftRight,
  BookOpenText,
  Boxes,
  ChartPie,
  LayoutDashboard,
  Percent,
  Receipt,
  Rows3,
  Scale,
  ShoppingBag,
} from "lucide-react";

import { ROUTES } from "@/shared/constants/routes";

/**
 * صفحه‌های بخشِ حسابداری به ترتیبِ نمایش در نوارِ بالای هر صفحه (`AccountingNav`). منوی
 * کناری (`navigationData`) همین‌ها را با توضیحِ بلندتر دارد. همه پشتِ یک دسترسی‌اند
 * (`AccountingView`)، پس اینجا دسترسیِ جدا لازم نیست.
 */
export const ACCOUNTING_PAGES = Object.freeze([
  { to: ROUTES.ACCOUNTING, label: "داشبورد مالی", icon: LayoutDashboard, end: true },
  { to: ROUTES.ACCOUNTING_PARTIES, label: "حساب اشخاص", icon: Scale },
  { to: ROUTES.ACCOUNTING_PARTY_LEDGER, label: "دفتر اشخاص", icon: BookOpenText },
  { to: ROUTES.ACCOUNTING_SALES, label: "دفتر فروش", icon: Receipt },
  { to: ROUTES.ACCOUNTING_PURCHASES, label: "دفتر خرید", icon: ShoppingBag },
  { to: ROUTES.ACCOUNTING_SALE_LINES, label: "ریز اقلام فروش", icon: Rows3 },
  { to: ROUTES.ACCOUNTING_PAYMENTS, label: "دریافت و پرداخت", icon: ArrowLeftRight },
  { to: ROUTES.ACCOUNTING_TAX, label: "مالیات ارزش افزوده", icon: Percent },
  { to: ROUTES.ACCOUNTING_INVENTORY, label: "ارزش موجودی", icon: Boxes },
  { to: ROUTES.ACCOUNTING_BREAKDOWN, label: "تفکیک فروش و خرید", icon: ChartPie },
]);
