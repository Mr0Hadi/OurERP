import { ROUTES } from "./routes";

import {
  ArrowLeftRight,
  BookOpenText,
  Boxes,
  Calculator,
  ChartPie,
  LayoutDashboard,
  Percent,
  Receipt,
  Landmark,
  PackageSearch,
  ListRestart,
  Wallet,
  PackageX,
  Rows3,
  Settings,
  Scale,
  ShoppingBag,
  Barcode,
  Box,
  Building2,
  CalendarClock,
  ClipboardList,
  FilePlus,
  KeyRound,
  LayoutTemplate,
  Home,
  List,
  PlusCircle,
  RotateCcw,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  UserCog,
  Users,
  Warehouse,
  Car,
  History,
  HandCoins,
  Banknote,
  FileCheck2,
  PackageCheck
} from "lucide-react";

export const navigationData = {
  // `permission` روی هر زیرآیتم نامِ یک عضوِ `PermissionEnum` سرور است (یا
  // آرایه‌ای از نام‌ها که *هرکدام* کافی است) و `AppSidebar` با آن فیلتر
  // می‌کند. آیتم‌های والد دسترسیِ خودشان را ندارند: والد وقتی دیده می‌شود
  // که دست‌کم یکی از فرزندانش دیده شود. آیتمِ بدون `permission` برای هر
  // کاربرِ واردشده نمایش داده می‌شود.
  //
  // `featureFlag` (اختیاری، روی والد یا زیرآیتم) کلیدِ یک سوییچِ `GetFeatureFlags`
  // است (مثلاً `"Warehouse.MultiWarehouseEnabled"`)؛ آیتم فقط وقتی دیده می‌شود
  // که آن سوییچ روشن باشد (`useFeatureFlags` در `features/auth/hooks/`).
  //
  // فقط *ساختارِ* منو. هویتِ کاربر و واحد/تیمِ او اینجا نیست: صفتِ خودِ
  // اوست در بکند (`User.DepartmentId`/`User.TeamId`) و سایدبار آن را از
  // `useUserInfoQuery` می‌گیرد.
  navMain: [
    {
      title: "داشبورد",
      url: ROUTES.DASHBOARD,
      icon: Home,
      isActive: false,
      items: [],
    },
    {
      // پرتکرارترین کار روزانه
      title: "فروش",
      url: ROUTES.SALES,
      icon: Store,
      isActive: false,
      items: [
        {
          title: "لیست فروش‌ها",
          url: ROUTES.SALES,
          permission: "SaleView",
          icon: List,
          description: "لیست فروش‌های ثبت‌شده",
        },
        {
          title: "ثبت فروش جدید",
          url: ROUTES.SALES_NEW,
          permission: ["SaleCreate", "SaleInPerson"],
          icon: FilePlus,
          description: "لیست قیمت، پیش‌فاکتور، یا فروشِ حضوری با اسکنِ کالا",
        },
        {
          title: "لیست مرجوعی‌ها",
          url: ROUTES.SALES_RETURNS_LIST,
          permission: "SaleReturnView",
          icon: List,
          description: "مشاهده لیست مرجوعی‌ها",
        },
        {
          title: "ثبت مرجوعی از مشتری",
          url: ROUTES.SALES_RETURNS_NEW,
          permission: "SaleReturnCreate",
          icon: RotateCcw,
          description: "ثبت مرجوعی کالا از مشتری",
        },
      ],
    },
    {
      // بلافاصله بعد از فروش: دریافت پول. به ترتیب تکرار استفاده.
      title: "صندوق",
      url: ROUTES.TREASURY,
      icon: Banknote,
      isActive: false,
      items: [
        {
          title: "صندوق فروش",
          url: ROUTES.TREASURY_CASHIER,
          permission: "SalePayment",
          icon: Wallet,
          description: "پیش‌فاکتورهای آماده‌ی پرداخت: دریافت و صدورِ فاکتور",
        },
        {
          title: "اقساط",
          url: ROUTES.TREASURY_INSTALLMENTS,
          permission: "SaleInstallmentView",
          icon: CalendarClock,
          description: "اقساطِ فروش‌های اقساطی، سررسیدها و دریافت",
        },
        {
          title: "چک‌ها",
          url: ROUTES.TREASURY_CHEQUES,
          permission: ["CheckView", "CheckManage"],
          icon: FileCheck2,
          description: "چک‌های دریافتی و پرداختی: سررسید، وصول، برگشت و خرج",
        },
        {
          title: "علی‌الحساب",
          url: ROUTES.TREASURY_PARTY_PAYMENTS,
          permission: ["PartyStatementView", "PartyPaymentCreate"],
          icon: HandCoins,
          description: "دریافت و پرداختِ بی‌فاکتور و تخصیص به فاکتورها",
        },
        {
          title: "حساب‌های نقدی و بانکی",
          url: ROUTES.TREASURY_ACCOUNTS,
          permission: ["BankAccountView", "BankAccountManage"],
          icon: Landmark,
          description: "صندوق‌ها و حساب‌های بانکی: مانده، گردش و انتقال بین حساب‌ها",
        },
      ],
    },
    {
      title: "خرید",
      url: ROUTES.PURCHASES,
      icon: ShoppingCart,
      isActive: false,
      items: [
        {
          title: "لیست خریدها",
          url: ROUTES.PURCHASES,
          permission: "PurchaseView",
          icon: List,
          description: "لیست خریدهای ثبت‌شده",
        },
        {
          title: "ثبت خرید جدید",
          url: ROUTES.PURCHASES_NEW,
          permission: "PurchaseCreate",
          icon: FilePlus,
          description: "ثبت فاکتور خرید جدید",
        },
        {
          title: "پیشنهاد خرید",
          url: ROUTES.PURCHASES_REORDER,
          permission: "ReorderSuggestionView",
          icon: ListRestart,
          description: "کالاهای رسیده به نقطه‌ی سفارش و ساختِ پیش‌فاکتورِ خرید",
        },
        {
          title: "لیست مرجوعی‌ها",
          url: ROUTES.PURCHASES_RETURNS_LIST,
          permission: "PurchaseReturnView",
          icon: List,
          description: "مشاهده لیست مرجوعی‌ها به تامین‌کننده",
        },
        {
          title: "ثبت مرجوعی به تامین‌کننده",
          url: ROUTES.PURCHASES_RETURNS_NEW,
          permission: "PurchaseReturnCreate",
          icon: RotateCcw,
          description: "ثبت مرجوعی کالا به تامین‌کننده",
        },
      ],
    },
    {
      // اول عملیات روزانه به ترتیب گردش کالا، بعد اطلاعات پایه‌ی کالا که کم تغییر می‌کنند.
      title: "انبار",
      url: ROUTES.WAREHOUSE,
      icon: Warehouse,
      isActive: false,
      items: [
        {
          title: "بررسی پیش‌فاکتورها",
          url: ROUTES.WAREHOUSE_SALE_CHECK,
          permission: "SaleWarehouseCheck",
          icon: PackageSearch,
          description: "برداشتن و اسکنِ کالای پیش‌فاکتورهای تأییدشده (رزرو) پیش از پرداخت",
        },
        {
          title: "ارسال کالا",
          url: ROUTES.WAREHOUSE_SHIPPING,
          permission: "SaleShip",
          icon: PackageCheck, // جدا از «دریافت کالا» (قبلاً هر دو ClipboardList بودند)
          description: "مشاهده و تأیید کالاهای ارسالی",
        },
        {
          title: "دریافت کالا",
          url: ROUTES.WAREHOUSE_RECEIVING,
          permission: "PurchaseReceive",
          icon: ClipboardList,
          description: "مشاهده و تأیید کالاهای دریافتی",
        },
        {
          title: "دانه‌ها و برچسب‌ها",
          url: ROUTES.WAREHOUSE_UNITS,
          permission: "ProductUnitView",
          icon: Barcode,
          description: "ردیابی هر دانه (انبار، قرنطینه، مشتری، اسقاط)، چاپ برچسب و شمارش",
        },
        {
          title: "لیست کالاها",
          url: ROUTES.WAREHOUSE_PRODUCTS,
          permission: "ProductView",
          icon: Box,
          description: "مشاهده و جستجوی کالاها",
        },
        {
          title: "تعریف کالای جدید",
          url: ROUTES.WAREHOUSE_PRODUCTS_NEW,
          permission: "ProductCreate",
          icon: PlusCircle,
          description: "ثبت کالای جدید",
        },
        {
          title: "دسته‌بندی کالاها",
          url: ROUTES.WAREHOUSE_CATEGORIES,
          permission: "ProductCategoryView",
          icon: Tags,
          description: "ایجاد، ویرایش و حذف دسته‌بندی‌های کالا",
        },
        {
          title: "خودروها",
          url: ROUTES.WAREHOUSE_VEHICLES,
          permission: ["VehicleView", "ProductCategoryView"],
          icon: Car,
          description: "خودروها و کالاهای مربوط به هر خودرو",
        },
      ],
    },
    {
      // مشتری و تامین‌کننده هر دو «طرف‌حساب» هستند. (نیاز به یک ROUTES.PARTIES یا استفاده از ROUTES.CUSTOMERS)
      title: "اشخاص",
      url: ROUTES.CUSTOMERS,
      icon: Users,
      isActive: false,
      items: [
        {
          title: "لیست مشتریان",
          url: ROUTES.CUSTOMERS_LIST,
          permission: "CustomerView",
          icon: List,
          description: "مشاهده و جستجوی مشتریان",
        },
        {
          title: "اضافه کردن مشتری جدید",
          url: ROUTES.CUSTOMERS_NEW,
          permission: "CustomerCreate",
          icon: PlusCircle,
          description: "ثبت مشتری جدید",
        },
        {
          title: "لیست تامین‌کنندگان",
          url: ROUTES.SUPPLIERS_LIST,
          permission: "SupplierView",
          icon: List,
          description: "مشاهده و جستجوی تامین‌کنندگان",
        },
        {
          title: "اضافه کردن تامین‌کننده",
          url: ROUTES.SUPPLIERS_NEW,
          permission: "SupplierCreate",
          icon: PlusCircle,
          description: "ثبت تامین‌کننده جدید",
        },
      ],
    },
    {
      // دفترها: ثبت و پیگیری. از کلی به جزئی.
      title: "دفتر حساب‌ها",
      url: ROUTES.ACCOUNTING,
      icon: Calculator,
      isActive: false,
      items: [
        {
          title: "داشبورد مالی",
          url: ROUTES.ACCOUNTING,
          permission: "AccountingView",
          icon: LayoutDashboard,
          description: "طلب و بدهی، فروش و خرید، جریان نقد و موارد نیازمند پیگیری",
        },
        {
          title: "حساب اشخاص",
          url: ROUTES.ACCOUNTING_PARTIES,
          permission: "AccountingView",
          icon: Scale,
          description: "مانده و سنی‌بندی بدهیِ مشتریان و تامین‌کنندگان",
        },
        {
          title: "دفتر حساب اشخاص",
          url: ROUTES.ACCOUNTING_PARTY_LEDGER,
          permission: "AccountingView",
          icon: BookOpenText,
          description: "همه‌ی ردیف‌های بدهکار و بستانکارِ اشخاص",
        },
        {
          title: "دفتر فروش",
          url: ROUTES.ACCOUNTING_SALES,
          permission: "AccountingView",
          icon: Receipt,
          description: "فاکتورهای فروش با مانده و سررسید",
        },
        {
          title: "دفتر خرید",
          url: ROUTES.ACCOUNTING_PURCHASES,
          permission: "AccountingView",
          icon: ShoppingBag,
          description: "فاکتورهای خرید با مانده و سررسید",
        },
        {
          title: "دریافت و پرداخت",
          url: ROUTES.ACCOUNTING_PAYMENTS,
          permission: "AccountingView",
          icon: ArrowLeftRight,
          description: "همه‌ی پرداخت‌ها و دریافت‌ها به تفکیکِ روش",
        },
        {
          title: "ارزش موجودی",
          url: ROUTES.ACCOUNTING_INVENTORY,
          permission: "AccountingView",
          icon: Boxes,
          description: "ارزشِ موجودیِ هر کالا و کالای قرنطینه",
        },
        {
          title: "مالیات ارزش افزوده",
          url: ROUTES.ACCOUNTING_TAX,
          permission: "AccountingView",
          icon: Percent,
          description: "مالیاتِ فروش و خرید به تفکیکِ دوره",
        },
      ],
    },
    {
      // گزارش‌ها: تحلیل و رتبه‌بندی. به‌صورت مجزا از دفترها. (ROUTES.REPORTS را تعریف کنید یا از ACCOUNTING_BREAKDOWN استفاده کنید)
      title: "گزارش‌ها",
      url: ROUTES.ACCOUNTING_BREAKDOWN,
      icon: ChartPie,
      isActive: false,
      items: [
        {
          title: "تفکیک فروش و خرید",
          url: ROUTES.ACCOUNTING_BREAKDOWN,
          permission: "AccountingView",
          icon: ChartPie,
          description: "فروش و خرید بر اساسِ کالا، دسته، طرف‌حساب یا کاربر",
        },
        {
          title: "ریز اقلام فروش",
          url: ROUTES.ACCOUNTING_SALE_LINES,
          permission: "AccountingView",
          icon: Rows3,
          description: "هر قلمِ هر فاکتورِ فروش",
        },
        {
          title: "آمار خرید مشتریان",
          url: ROUTES.ACCOUNTING_CUSTOMERS,
          permission: "ReportView",
          icon: Users,
          description: "پرخریدترین مشتریان و مانده‌ی تسویه‌نشده",
        },
        {
          title: "آمار خرید از تامین‌کنندگان",
          url: ROUTES.ACCOUNTING_SUPPLIERS,
          permission: "ReportView",
          icon: Truck,
          description: "خرید از هر تامین‌کننده و وضعیت پرداخت",
        },
        {
          title: "فعالیت کارمندان",
          url: ROUTES.ACCOUNTING_EMPLOYEES,
          permission: "ReportView",
          icon: UserCog,
          description: "رتبه‌بندی کارمندان بر اساس فروش و خرید ثبت‌شده",
        },
        {
          title: "گزارش‌های انبار",
          url: ROUTES.ACCOUNTING_WAREHOUSE_ISSUES,
          permission: ["AccountingView", "SaleWarehouseIssueResolve"],
          icon: PackageX,
          description: "دانه‌های معیوب/مفقودِ بررسیِ انبار: بازگشت، اسقاط یا مرجوعی",
        },
      ],
    },
    {
      // مدیریت و پیکربندی: کم‌استفاده، پایین لیست.
      title: "کارمندان و سازمان",
      url: ROUTES.EMPLOYEES,
      icon: UserCog,
      isActive: false,
      items: [
        {
          title: "لیست کارمندان",
          url: ROUTES.EMPLOYEES_LIST,
          permission: "UserView",
          icon: List,
          description: "مشاهده و جستجوی کاربران سیستم",
        },
        {
          title: "افزودن کارمند جدید",
          url: ROUTES.EMPLOYEES_NEW,
          permission: "UserCreate",
          icon: PlusCircle,
          description: "ثبت کارمند و ساخت حساب کاربری",
        },
        {
          title: "واحدهای سازمانی",
          url: ROUTES.ORG_DEPARTMENTS,
          permission: "DepartmentView",
          icon: Building2,
          description: "تعریف واحدها و تعیین مدیر هر واحد",
        },
        {
          title: "تیم‌ها",
          url: ROUTES.ORG_TEAMS,
          permission: "TeamView",
          icon: Users,
          description: "تعریف تیم‌های هر واحد و تعیین مدیر تیم",
        },
        {
          title: "دسترسی کارمندان",
          url: ROUTES.ACCESS_USERS,
          permission: "PermissionView",
          icon: KeyRound,
          description: "تعیین دسترسی هر کارمند، با پیشنهادِ الگوی واحدش",
        },
        {
          title: "الگوهای واحدها",
          url: ROUTES.ACCESS_TEMPLATES,
          permission: "PermissionView",
          icon: LayoutTemplate,
          description: "دسترسی‌هایی که معمولاً به کارمندانِ هر واحد داده می‌شود",
        },
        {
          title: "گزارش فعالیت کاربران",
          url: ROUTES.AUDIT,
          permission: "AuditLogView",
          icon: History,
          description: "هر ثبت، ویرایش و حذف با نامِ کاربر، زمان و مقدارهای قبل و بعد",
        },
      ],
    },
    {
      // همیشه آخر؛ کمترین تکرار استفاده.
      title: "تنظیمات",
      url: ROUTES.SETTINGS,
      icon: Settings,
      isActive: false,
      items: [
        {
          title: "تنظیمات سامانه",
          url: ROUTES.SETTINGS,
          permission: ["SettingView", "SettingManage"],
          icon: Settings,
          description: "مهلت رزرو، اجباری‌بودنِ حساب در پرداخت، دیرکرد و تسویه‌ی اقساط",
        },
      ],
    },
  ],
};
