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
  Truck,
  UserCog,
  Users,
} from "lucide-react";

import { ROUTES } from "@/shared/constants/routes";

/**
 * صفحه‌های بخشِ «حسابداری و گزارش‌ها» به ترتیبِ نمایش در نوارِ بالای هر صفحه
 * (`AccountingNav`)، در دو گروه: دفترهای حسابداری (`AccountingView`) و گزارش‌های فعالیت
 * (`ReportView`، پیش‌تر بخشِ جدای «گزارش‌ها»). نوار فقط صفحه‌هایی را نشان می‌دهد که کاربر
 * مجاز است؛ منوی کناری (`navigationData`) همین‌ها را با توضیحِ بلندتر دارد.
 */
const ACCOUNTING = "AccountingView";
const REPORT = "ReportView";

export const ACCOUNTING_PAGE_GROUPS = Object.freeze([
  {
    key: "accounting",
    label: "حسابداری",
    pages: [
      { to: ROUTES.ACCOUNTING, label: "داشبورد مالی", icon: LayoutDashboard, end: true, permission: ACCOUNTING },
      { to: ROUTES.ACCOUNTING_PARTIES, label: "حساب اشخاص", icon: Scale, permission: ACCOUNTING },
      { to: ROUTES.ACCOUNTING_PARTY_LEDGER, label: "دفتر اشخاص", icon: BookOpenText, permission: ACCOUNTING },
      { to: ROUTES.ACCOUNTING_SALES, label: "دفتر فروش", icon: Receipt, permission: ACCOUNTING },
      { to: ROUTES.ACCOUNTING_PURCHASES, label: "دفتر خرید", icon: ShoppingBag, permission: ACCOUNTING },
      { to: ROUTES.ACCOUNTING_SALE_LINES, label: "ریز اقلام فروش", icon: Rows3, permission: ACCOUNTING },
      { to: ROUTES.ACCOUNTING_PAYMENTS, label: "دریافت و پرداخت", icon: ArrowLeftRight, permission: ACCOUNTING },
      { to: ROUTES.ACCOUNTING_TAX, label: "مالیات ارزش افزوده", icon: Percent, permission: ACCOUNTING },
      { to: ROUTES.ACCOUNTING_INVENTORY, label: "ارزش موجودی", icon: Boxes, permission: ACCOUNTING },
      { to: ROUTES.ACCOUNTING_BREAKDOWN, label: "تفکیک فروش و خرید", icon: ChartPie, permission: ACCOUNTING },
    ],
  },
  {
    key: "activity",
    label: "گزارش فعالیت",
    pages: [
      { to: ROUTES.ACCOUNTING_EMPLOYEES, label: "فعالیت کارمندان", icon: UserCog, permission: REPORT },
      { to: ROUTES.ACCOUNTING_CUSTOMERS, label: "مشتریان", icon: Users, permission: REPORT },
      { to: ROUTES.ACCOUNTING_SUPPLIERS, label: "تامین‌کنندگان", icon: Truck, permission: REPORT },
    ],
  },
]);
