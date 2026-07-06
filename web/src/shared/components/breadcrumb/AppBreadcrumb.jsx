import React from 'react'
import { useLocation, Link } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/breadcrumb/breadcrumb";

// نگاشت مسیرها به عناوین فارسی
const ROUTE_TITLES = {
  // داشبورد
  [ROUTES.DASHBOARD]: "داشبورد",    

  // تامین کنندگان
  [ROUTES.SUPPLIERS_LIST]: "تامین کنندگان",
  [ROUTES.SUPPLIERS_NEW]: "تامین کننده جدید",

  // مشتریان
  [ROUTES.CUSTOMERS_LIST]: "مشتریان",
  [ROUTES.CUSTOMERS_NEW]: "مشتری جدید",

  // محصولات
  [ROUTES.PRODUCTS_LIST]: "محصولات",
  [ROUTES.PRODUCTS_NEW]: "محصول جدید",

  // خرید
  [ROUTES.PURCHASES]: "خرید",
  [ROUTES.PURCHASES_NEW]: "ثبت خرید جدید",
  [ROUTES.PURCHASES_INVOICES]: "فاکتورهای خرید",
  [ROUTES.PURCHASES_RETURNS_LIST]: "مرجوعی‌های خرید",
  [ROUTES.PURCHASES_RETURNS_NEW]: "ثبت مرجوعی خرید",

  // فروش
  [ROUTES.SALES]: "فروش",
  [ROUTES.SALES_NEW]: "ثبت فروش جدید",
  [ROUTES.SALES_ORDERS]: "سفارشات فروش",
  [ROUTES.SALES_INVOICES_NEW]: "صدور فاکتور فروش",
  [ROUTES.SALES_PROFORMA]: "پیش فاکتور",
  [ROUTES.SALES_RETURNS_LIST]: "مرجوعی‌های فروش",
  [ROUTES.SALES_RETURNS_NEW]: "ثبت مرجوعی فروش",

  // انبار
  [ROUTES.WAREHOUSE]: "مدیریت موجودی",
  [ROUTES.WAREHOUSE]: "انبار",
  [ROUTES.WAREHOUSE_PRODUCTS]: "کالاهای انبار",
  [ROUTES.WAREHOUSE_PRODUCTS_NEW]: "کالای جدید",
  [ROUTES.WAREHOUSE_STOCK]: "موجودی انبار",
  [ROUTES.WAREHOUSE_TRANSACTIONS]: "تراکنش‌های انبار",

  // فاکتورها
  [ROUTES.INVOICE]: "فاکتورها",
  [ROUTES.INVOICE_LIST]: "لیست فاکتورها",
  [ROUTES.INVOICE_NEW]: "فاکتور جدید",

  // تراکنش‌ها
  [ROUTES.TRANSACTIONS]: "تراکنش‌ها",
  [ROUTES.TRANSACTIONS_LIST]: "تراکنش‌ها",
  [ROUTES.TRANSACTIONS_BUY_SELL]: "خرید و فروش",
  [ROUTES.TRANSACTIONS_PAYMENTS]: "پرداخت‌ها",
  [ROUTES.TRANSACTIONS_RETURNS]: "مرجوعی‌ها",

  // گزارشات
  [ROUTES.REPORTS]: "گزارشات",
  [ROUTES.REPORTS_SALES]: "گزارش فروش",
  [ROUTES.REPORTS_PURCHASES]: "گزارش خرید",
  [ROUTES.REPORTS_FINANCIAL]: "گزارش مالی",
  [ROUTES.REPORTS_PROFIT_LOSS]: "سود و زیان",
  [ROUTES.REPORTS_warehouse]: "گزارش موجودی",

  // تنظیمات
  [ROUTES.SETTINGS]: "تنظیمات",
  [ROUTES.SETTINGS_GENERAL]: "تنظیمات عمومی",
  [ROUTES.SETTINGS_COMPANY]: "اطلاعات شرکت",
  [ROUTES.SETTINGS_INVOICE]: "تنظیمات فاکتور",
  [ROUTES.SETTINGS_TAX]: "تنظیمات مالیات",
  [ROUTES.SETTINGS_USERS]: "مدیریت کاربران",
  [ROUTES.SETTINGS_ROLES]: "نقش‌ها",
  [ROUTES.SETTINGS_NOTIFICATIONS]: "اعلان‌ها",
  [ROUTES.SETTINGS_BACKUP]: "پشتیبان‌گیری",

  // ابزارها
  [ROUTES.TOOLS_NUMBER_TO_WORDS]: "تبدیل عدد به حروف",
  [ROUTES.TOOLS_CALENDAR]: "تقویم",

  // پشتیبانی
  [ROUTES.FEEDBACK]: "بازخورد",

  // احراز هویت
  [ROUTES.AUTH]: "احراز هویت",
  [ROUTES.LOGIN]: "ورود",
  [ROUTES.REGISTER]: "ثبت‌نام",
  [ROUTES.FORGOT_PASSWORD]: "فراموشی رمز عبور",
  [ROUTES.RESET_PASSWORD]: "بازنشانی رمز عبور",
};

// الگوهای مسیرهای داینامیک
const DYNAMIC_PATTERNS = [
  {
    regex: /^\/suppliers\/edit\/(\d+)$/,
    getTitle: () => "ویرایش تامین کننده",
    parentPath: ROUTES.SUPPLIERS_LIST,
  },
  {
    regex: /^\/suppliers\/(\d+)$/,
    getTitle: () => "جزئیات تامین کننده",
    parentPath: ROUTES.SUPPLIERS_LIST,
  },
  {
    regex: /^\/customers\/edit\/(\d+)$/,
    getTitle: () => "ویرایش مشتری",
    parentPath: ROUTES.CUSTOMERS_LIST,
  },
  {
    regex: /^\/customers\/(\d+)$/,
    getTitle: () => "جزئیات مشتری",
    parentPath: ROUTES.CUSTOMERS_LIST,
  },
  {
    regex: /^\/products\/edit\/(\d+)$/,
    getTitle: () => "ویرایش محصول",
    parentPath: ROUTES.PRODUCTS_LIST,
  },
  {
    regex: /^\/products\/(\d+)$/,
    getTitle: () => "جزئیات محصول",
    parentPath: ROUTES.PRODUCTS_LIST,
  },
  {
    regex: /^\/purchases\/invoices\/(\d+)$/,
    getTitle: () => "جزئیات فاکتور خرید",
    parentPath: ROUTES.PURCHASES_INVOICES,
  },
  {
    regex: /^\/sales\/orders\/(\d+)$/,
    getTitle: () => "جزئیات سفارش فروش",
    parentPath: ROUTES.SALES_ORDERS,
  },
  {
    regex: /^\/invoice\/(\d+)$/,
    getTitle: () => "جزئیات فاکتور",
    parentPath: ROUTES.INVOICE_LIST,
  },
];

// تطبیق مسیر داینامیک
function matchDynamicRoute(pathname) {
  for (const pattern of DYNAMIC_PATTERNS) {
    const match = pathname.match(pattern.regex);
    if (match) {
      return {
        title: pattern.getTitle(pathname),
        parentPath: pattern.parentPath,
      };
    }
  }
  return null;
}

// ساخت breadcrumbs از مسیر
function buildBreadcrumbs(pathname) {
  const breadcrumbs = [];

  // صفحه اصلی (/) و داشبورد یکی هستند
  if (pathname === "/" || pathname === ROUTES.DASHBOARD) {
    breadcrumbs.push({ path: "/", title: "داشبورد" });
    return breadcrumbs;
  }

  // بررسی مسیر داینامیک
  const dynamicMatch = matchDynamicRoute(pathname);

  if (dynamicMatch) {
    // اضافه کردن والد
    const parentTitle = ROUTE_TITLES[dynamicMatch.parentPath];
    if (parentTitle) {
      breadcrumbs.push({ path: dynamicMatch.parentPath, title: parentTitle });
    }
    // اضافه کردن صفحه فعلی
    breadcrumbs.push({ path: pathname, title: dynamicMatch.title });
  } else {
    // مسیرهای استاتیک
    const segments = pathname.split("/").filter(Boolean);
    let accumulated = "";

    for (const segment of segments) {
      accumulated += `/${segment}`;
      const title = ROUTE_TITLES[accumulated];

      if (title) {
        breadcrumbs.push({ path: accumulated, title });
      }
    }
  }

  return breadcrumbs;
}

export function AppBreadcrumb() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/$/, "") || "/";

  const breadcrumbs = buildBreadcrumbs(pathname);

  // اگر breadcrumb خالی است، نمایش نده
  if (breadcrumbs.length === 0) return null;

return (
  <Breadcrumb dir='ltr'>
    <BreadcrumbList>
      {/* Home Item */}
      <BreadcrumbItem>
        <BreadcrumbLink asChild>
          <Link to="/">خانه</Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
      
      {/* Separator after Home */}
      <BreadcrumbSeparator />

      {/* Map over the rest */}
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;

        return (
          // Use React.Fragment so we can return multiple siblings
          <React.Fragment key={crumb.path}>
            <BreadcrumbItem>
              {isLast ? (
                <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path}>{crumb.title}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>

            {/* Separator goes HERE, as a sibling to the Item, but only if it's not the last one */}
            {!isLast && <BreadcrumbSeparator />}
          </React.Fragment>
        );
      })}
    </BreadcrumbList>
  </Breadcrumb>
);
}
