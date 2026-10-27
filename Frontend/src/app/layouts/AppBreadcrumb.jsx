import { cn } from "@/shared/lib/utils";
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
} from "@/shared/components/ui/breadcrumb";

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

  [ROUTES.ACCESS]: "سطح دسترسی",
  [ROUTES.ACCESS_USERS]: "دسترسی کارمندان",
  [ROUTES.ACCESS_TEMPLATES]: "الگوهای دسترسی واحدها",

  [ROUTES.AUDIT]: "گزارش فعالیت کاربران",

  [ROUTES.PURCHASES]: "خرید",
  [ROUTES.PURCHASES_NEW]: "ثبت خرید جدید",
  [ROUTES.PURCHASES_REORDER]: "پیشنهاد خرید",
  [ROUTES.PURCHASES_RETURNS_LIST]: "مرجوعی‌های خرید",
  "/purchases/returns/new": "ثبت مرجوعی خرید",

  [ROUTES.SALES]: "فروش",
  [ROUTES.SALES_NEW]: "ثبت فروش جدید",
  [ROUTES.SALES_RETURNS_LIST]: "مرجوعی‌های فروش",
  [ROUTES.SALES_RETURNS_NEW]: "ثبت مرجوعی فروش",

  [ROUTES.TREASURY]: "صندوق و مدیریت پرداخت‌ها",
  [ROUTES.TREASURY_CASHIER]: "صندوق فروش",
  [ROUTES.TREASURY_INSTALLMENTS]: "اقساط",
  [ROUTES.TREASURY_ACCOUNTS]: "حساب‌های نقدی و بانکی",
  [ROUTES.TREASURY_PARTY_PAYMENTS]: "علی‌الحساب",
  [ROUTES.TREASURY_CHEQUES]: "چک‌ها",

  [ROUTES.WAREHOUSE]: "انبار",
  [ROUTES.WAREHOUSE_PRODUCTS]: "کالاهای انبار",
  [ROUTES.WAREHOUSE_PRODUCTS_NEW]: "کالای جدید",
  [ROUTES.WAREHOUSE_UNITS]: "دانه‌ها و برچسب‌ها",
  [ROUTES.WAREHOUSE_CATEGORIES]: "دسته‌بندی کالاها",
  [ROUTES.WAREHOUSE_VEHICLES]: "خودروها",
  [ROUTES.WAREHOUSE_RECEIVING]: "دریافت کالا",
  [ROUTES.WAREHOUSE_SHIPPING]: "ارسال کالا",
  [ROUTES.WAREHOUSE_SALE_CHECK]: "بررسی انبارِ پیش‌فاکتور",

  [ROUTES.ACCOUNTING]: "دفتر حساب‌ها",
  [ROUTES.ACCOUNTING_PARTIES]: "حساب اشخاص",
  [ROUTES.ACCOUNTING_PARTY_LEDGER]: "دفتر حساب اشخاص",
  [ROUTES.ACCOUNTING_SALES]: "دفتر فروش",
  [ROUTES.ACCOUNTING_PURCHASES]: "دفتر خرید",
  [ROUTES.ACCOUNTING_SALE_LINES]: "ریز اقلام فروش",
  [ROUTES.ACCOUNTING_PAYMENTS]: "دریافت و پرداخت",
  [ROUTES.ACCOUNTING_WAREHOUSE_ISSUES]: "گزارش‌های انبار",
  [ROUTES.ACCOUNTING_TAX]: "مالیات ارزش افزوده",
  [ROUTES.ACCOUNTING_INVENTORY]: "ارزش موجودی",
  [ROUTES.ACCOUNTING_BREAKDOWN]: "تفکیک فروش و خرید",
  [ROUTES.ACCOUNTING_EMPLOYEES]: "فعالیت کارمندان",
  [ROUTES.ACCOUNTING_CUSTOMERS]: "آمار خرید مشتریان",
  [ROUTES.ACCOUNTING_SUPPLIERS]: "آمار خرید از تامین‌کنندگان",

  [ROUTES.SETTINGS]: "تنظیمات",
  [ROUTES.ACCOUNT]: "حساب کاربری",

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
  [ROUTES.ACCESS_USERS]: "کارمند",
  [ROUTES.ACCESS_TEMPLATES]: "واحد",
  [ROUTES.AUDIT]: "رویداد",

  [ROUTES.PURCHASES]: "جزئیات خرید",
  [ROUTES.PURCHASES_RETURNS_LIST]: "جزئیات مرجوعی خرید",

  [ROUTES.SALES]: "جزئیات فروش",
  [ROUTES.SALES_RETURNS_LIST]: "جزئیات مرجوعی فروش",

  [ROUTES.WAREHOUSE_PRODUCTS]: "جزئیات کالا",
  [ROUTES.WAREHOUSE_VEHICLES]: "جزئیات خودرو",
  [ROUTES.WAREHOUSE_RECEIVING]: "دریافت خرید",
  [ROUTES.WAREHOUSE_SHIPPING]: "ارسال فروش",
  [ROUTES.WAREHOUSE_SALE_CHECK]: "بررسی پیش‌فاکتور",
  "/warehouse/receiving/returns": "دریافت کالای مرجوعی",
  // عودت، آزادسازی و اسقاطِ قرنطینه — نه فقط عودت.
  "/warehouse/shipping/returns": "کار انبار روی مرجوعی خرید",
};

/**
 * مسیرهایی که عنوان دارند ولی *صفحه* ندارند — فقط یک سرشاخه‌ی گروه‌بندی
 * در URL اند. عنوانشان نمایش داده می‌شود تا مسیر ناقص به نظر نرسد، ولی
 * لینک نمی‌شوند چون کلیک روی‌شان کاربر را به ۴۰۴ می‌برد.
 */
const NON_LINKABLE = new Set([ROUTES.ORGANIZATION, ROUTES.ACCESS]);

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
    // در موبایل فقط صفحه‌ی فعلی (یک خط و کوتاه‌شده) — مسیرِ کامل در هدرِ کوچک چند خط می‌شد و بیرون می‌زد.
    <Breadcrumb dir='ltr' className="min-w-0">
      <BreadcrumbList className="flex-nowrap md:flex-wrap">
        <BreadcrumbItem className={cn(breadcrumbs.length > 0 && "hidden md:inline-flex")}>
          <BreadcrumbLink asChild>
            <Link to={ROUTES.DASHBOARD}>خانه</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;

          return (
            <React.Fragment key={crumb.path}>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className={cn("min-w-0", !isLast && "hidden md:inline-flex")}>
                {isLast ? (
                  <BreadcrumbPage className="truncate">{crumb.title}</BreadcrumbPage>
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
