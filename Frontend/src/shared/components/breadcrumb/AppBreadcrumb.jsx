import React from "react";
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

/**
 * عنوان مسیرهای ثابت — کلید، خودِ مسیر است.
 *
 * فقط مسیرهایی که واقعاً وجود دارند. نسخه‌ی قبلی چند کلید از
 * ROUTES می‌خواند که کامنت شده بودند (PRODUCTS_LIST و ...) و چون
 * undefined بودند همگی روی یک کلیدِ "undefined" می‌نشستند.
 */
const ROUTE_TITLES = {
  [ROUTES.DASHBOARD]: "داشبورد",

  [ROUTES.SUPPLIERS_LIST]: "تامین کنندگان",
  [ROUTES.SUPPLIERS_NEW]: "تامین کننده جدید",

  [ROUTES.CUSTOMERS_LIST]: "مشتریان",
  [ROUTES.CUSTOMERS_NEW]: "مشتری جدید",

  [ROUTES.EMPLOYEES_LIST]: "کارمندان",
  [ROUTES.EMPLOYEES_NEW]: "کارمند جدید",

  [ROUTES.ORGANIZATION]: "ساختار سازمانی",
  [ROUTES.ORG_DEPARTMENTS]: "واحدهای سازمانی",
  [ROUTES.ORG_DEPARTMENTS_NEW]: "واحد جدید",
  [ROUTES.ORG_TEAMS]: "تیم‌ها",
  [ROUTES.ORG_TEAMS_NEW]: "تیم جدید",

  [ROUTES.PURCHASES]: "خرید",
  [ROUTES.PURCHASES_NEW]: "ثبت خرید جدید",
  [ROUTES.PURCHASES_INVOICES]: "فاکتورهای خرید",
  [ROUTES.PURCHASES_RETURNS_LIST]: "مرجوعی‌های خرید",
  "/purchases/returns/new": "ثبت مرجوعی خرید",

  [ROUTES.SALES]: "فروش",
  [ROUTES.SALES_NEW]: "ثبت فروش جدید",
  [ROUTES.SALES_ORDERS]: "سفارشات فروش",
  [ROUTES.SALES_INVOICES_NEW]: "صدور فاکتور فروش",
  [ROUTES.SALES_PROFORMA]: "پیش فاکتور",
  [ROUTES.SALES_RETURNS_LIST]: "مرجوعی‌های فروش",
  [ROUTES.SALES_RETURNS_NEW]: "ثبت مرجوعی فروش",

  [ROUTES.WAREHOUSE]: "انبار",
  [ROUTES.WAREHOUSE_PRODUCTS]: "کالاهای انبار",
  [ROUTES.WAREHOUSE_PRODUCTS_NEW]: "کالای جدید",
  [ROUTES.WAREHOUSE_UNIT_LABELS]: "برچسب کالاها",
  [ROUTES.WAREHOUSE_RECEIVING]: "دریافت کالا",
  [ROUTES.WAREHOUSE_SHIPPING]: "ارسال کالا",
  [ROUTES.WAREHOUSE_STOCK]: "موجودی انبار",
  [ROUTES.WAREHOUSE_TRANSACTIONS]: "تراکنش‌های انبار",

  [ROUTES.INVOICE]: "فاکتورها",
  [ROUTES.INVOICE_LIST]: "لیست فاکتورها",
  [ROUTES.INVOICE_NEW]: "فاکتور جدید",

  [ROUTES.TRANSACTIONS]: "تراکنش‌ها",
  [ROUTES.TRANSACTIONS_BUY_SELL]: "خرید و فروش",
  [ROUTES.TRANSACTIONS_PAYMENTS]: "پرداخت‌ها",
  [ROUTES.TRANSACTIONS_RETURNS]: "مرجوعی‌ها",

  [ROUTES.REPORTS]: "گزارشات",
  [ROUTES.REPORTS_SALES]: "گزارش فروش",
  [ROUTES.REPORTS_PURCHASES]: "گزارش خرید",
  [ROUTES.REPORTS_FINANCIAL]: "گزارش مالی",
  [ROUTES.REPORTS_PROFIT_LOSS]: "سود و زیان",
  [ROUTES.REPORTS_warehouse]: "گزارش موجودی",

  [ROUTES.SETTINGS]: "تنظیمات",
  [ROUTES.SETTINGS_GENERAL]: "تنظیمات عمومی",
  [ROUTES.SETTINGS_COMPANY]: "اطلاعات شرکت",
  [ROUTES.SETTINGS_INVOICE]: "تنظیمات فاکتور",
  [ROUTES.SETTINGS_TAX]: "تنظیمات مالیات",
  [ROUTES.SETTINGS_USERS]: "مدیریت کاربران",
  [ROUTES.SETTINGS_ROLES]: "نقش‌ها",
  [ROUTES.SETTINGS_NOTIFICATIONS]: "اعلان‌ها",
  [ROUTES.SETTINGS_BACKUP]: "پشتیبان‌گیری",

  [ROUTES.TOOLS_NUMBER_TO_WORDS]: "تبدیل عدد به حروف",
  [ROUTES.TOOLS_CALENDAR]: "تقویم",

  [ROUTES.FEEDBACK]: "بازخورد",
  [ROUTES.AUTH]: "احراز هویت",
  [ROUTES.LOGIN]: "ورود",
};

/**
 * وقتی یک بخش از مسیر «شناسه» است، عنوانش از مسیرِ والدش می‌آید.
 *
 * جای فهرستِ الگوهای regexی نسخه‌ی قبلی را گرفته: آن فهرست باید با هر
 * مسیر تازه دستی به‌روز می‌شد و در عمل نشده بود — نه جزئیات فروش، نه
 * جزئیات خرید، نه هیچ‌کدام از صفحه‌های انبار در آن نبودند و مسیرشان
 * ناقص نمایش داده می‌شد.
 */
const DETAIL_TITLES = {
  [ROUTES.SUPPLIERS_LIST]: "جزئیات تامین کننده",
  [ROUTES.CUSTOMERS_LIST]: "جزئیات مشتری",

  [ROUTES.EMPLOYEES_LIST]: "جزئیات کارمند",
  [ROUTES.ORG_DEPARTMENTS]: "جزئیات واحد",
  [ROUTES.ORG_TEAMS]: "جزئیات تیم",

  [ROUTES.PURCHASES]: "جزئیات خرید",
  [ROUTES.PURCHASES_INVOICES]: "جزئیات فاکتور خرید",
  [ROUTES.PURCHASES_RETURNS_LIST]: "جزئیات مرجوعی خرید",

  [ROUTES.SALES]: "جزئیات فروش",
  [ROUTES.SALES_ORDERS]: "جزئیات سفارش فروش",
  [ROUTES.SALES_RETURNS_LIST]: "جزئیات مرجوعی فروش",

  [ROUTES.WAREHOUSE_PRODUCTS]: "جزئیات کالا",
  [ROUTES.WAREHOUSE_RECEIVING]: "دریافت خرید",
  [ROUTES.WAREHOUSE_SHIPPING]: "ارسال فروش",
  "/warehouse/receiving/returns": "دریافت کالای مرجوعی",
  "/warehouse/shipping/returns": "عودت به تامین‌کننده",

  [ROUTES.INVOICE]: "جزئیات فاکتور",
};

/**
 * مسیرهایی که عنوان دارند ولی *صفحه* ندارند — فقط یک سرشاخه‌ی گروه‌بندی
 * در URL اند. عنوانشان نمایش داده می‌شود تا مسیر ناقص به نظر نرسد، ولی
 * لینک نمی‌شوند چون کلیک روی‌شان کاربر را به ۴۰۴ می‌برد.
 */
const NON_LINKABLE = new Set([ROUTES.ORGANIZATION]);

const isIdSegment = (segment) => /^\d+$/.test(segment);

function buildBreadcrumbs(pathname) {
  if (pathname === "/" || pathname === ROUTES.DASHBOARD) {
    return [{ path: ROUTES.DASHBOARD, title: "داشبورد" }];
  }

  const crumbs = [];
  let accumulated = "";

  for (const segment of pathname.split("/").filter(Boolean)) {
    const parent = accumulated;
    accumulated += `/${segment}`;

    if (isIdSegment(segment)) {
      // شناسه فقط وقتی یک پله‌ی جدا می‌شود که والدش عنوانِ «جزئیات»
      // داشته باشد. در مسیری مثل /purchases/returns/new/۵ که والد خودش
      // نامِ صفحه است، شناسه پله‌ی اضافه‌ای نمی‌سازد.
      const detailTitle = DETAIL_TITLES[parent];
      if (detailTitle) crumbs.push({ path: accumulated, title: detailTitle });
      continue;
    }

    const title = ROUTE_TITLES[accumulated];
    if (title) crumbs.push({ path: accumulated, title });
  }

  return crumbs;
}

export function AppBreadcrumb() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/$/, "") || "/";

  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <Breadcrumb dir='ltr'>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={ROUTES.DASHBOARD}>خانه</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;

          return (
            <React.Fragment key={crumb.path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                ) : NON_LINKABLE.has(crumb.path) ? (
                  <span className="text-muted-foreground">{crumb.title}</span>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path}>{crumb.title}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
