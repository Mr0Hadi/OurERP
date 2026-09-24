import { ROUTES } from "./routes";

import {
  BarChart3,
  Barcode,
  BookOpen,
  Box,
  Building2,
  ClipboardList,
  FilePlus,
  FileText,
  HelpCircle,
  KeyRound,
  LayoutTemplate,
  Home,
  Info,
  List,
  PlusCircle,
  RotateCcw,
  Shield,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  UserCog,
  Users,
  Warehouse,
} from "lucide-react";

export const navigationData = {
  // `permission` روی هر زیرآیتم نامِ یک عضوِ `PermissionEnum` سرور است (یا
  // آرایه‌ای از نام‌ها که *هرکدام* کافی است) و `AppSidebar` با آن فیلتر
  // می‌کند. آیتم‌های والد دسترسیِ خودشان را ندارند: والد وقتی دیده می‌شود
  // که دست‌کم یکی از فرزندانش دیده شود. آیتمِ بدون `permission` برای هر
  // کاربرِ واردشده نمایش داده می‌شود.
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
      title: "تامین کنندگان",
      url: ROUTES.SUPPLIERS,
      icon: Truck,
      isActive: false,
      items: [
        {
          title: "لیست تامین کنندگان",
          url: ROUTES.SUPPLIERS_LIST,
          permission: "SupplierView",
          icon: List,
          description: "مشاهده و جستجوی تامین کنندگان",
        },
        {
          title: "اضافه کردن تامین کننده",
          url: ROUTES.SUPPLIERS_NEW,
          permission: "SupplierCreate",
          icon: PlusCircle,
          description: "ثبت تامین کننده جدید",
        },
      ],
    },
    {
      title: "مشتریان",
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
      ],
    },
    {
      title: "کارمندان",
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
      ],
    },
    {
      title: "ساختار سازمانی",
      url: ROUTES.ORGANIZATION,
      icon: Building2,
      isActive: false,
      items: [
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
      ],
    },
    {
      title: "سطح دسترسی",
      url: ROUTES.ACCESS_USERS,
      icon: KeyRound,
      isActive: false,
      items: [
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
      ],
    },
    {
      title: "انبار",
      url: ROUTES.WAREHOUSE,
      icon: Warehouse,
      isActive: false,
      items: [
        {
          title: "لیست کالاها",
          url: ROUTES.WAREHOUSE_PRODUCTS,
          permission: "ProductView",
          icon: Box,
          description: "مشاهده و جستجوی کالاها",
        },
        {
          title: "دسته‌بندی کالاها",
          url: ROUTES.WAREHOUSE_CATEGORIES,
          permission: "ProductCategoryView",
          icon: Tags,
          description: "ایجاد، ویرایش و حذف دسته‌بندی‌های کالا",
        },
        {
          title: "تعریف کالای جدید",
          url: ROUTES.WAREHOUSE_PRODUCTS_NEW,
          permission: "ProductCreate",
          icon: PlusCircle,
          description: "ثبت کالای جدید",
        },
        {
          title: "دریافت کالا",
          url: ROUTES.WAREHOUSE_RECEIVING,
          permission: "PurchaseReceive",
          icon: ClipboardList,
          description: "مشاهده و تأیید کالاهای دریافتی",
        },
        {
          title: "ارسال کالا",
          url: ROUTES.WAREHOUSE_SHIPPING,
          permission: "SaleShip",
          icon: ClipboardList,
          description: "مشاهده و تأیید کالاهای ارسالی",
        },
        {
          title: "دانه‌ها و برچسب‌ها",
          url: ROUTES.WAREHOUSE_UNITS,
          permission: "ProductUnitView",
          icon: Barcode,
          description: "ردیابی هر دانه (انبار، قرنطینه، مشتری، اسقاط)، چاپ برچسب و شمارش",
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
          title: "لیست خرید ها",
          url: ROUTES.PURCHASES,
          permission: "PurchaseView",
          icon: FilePlus,
          description: "لیست خرید های ثبت شده",
        },
        {
          title: "ثبت خرید جدید",
          url: ROUTES.PURCHASES_NEW,
          permission: "PurchaseCreate",
          icon: FilePlus,
          description: "ثبت فاکتور خرید جدید",
        },
        {
          title: "ثبت مرجوعی به تامین‌کننده",
          url: ROUTES.PURCHASES_RETURNS_NEW,
          permission: "PurchaseReturnCreate",
          icon: RotateCcw,
          description: "ثبت مرجوعی کالا به تامین‌کننده",
        },
        {
          title: "لیست مرجوعی‌ها",
          url: ROUTES.PURCHASES_RETURNS_LIST,
          permission: "PurchaseReturnView",
          icon: List,
          description: "مشاهده لیست مرجوعی‌ها",
        },
      ],
    },
    {
      title: "فروش",
      url: ROUTES.SALES,
      icon: Store,
      isActive: false,
      items: [
        {
          title: "لیست فروش ها",
          url: ROUTES.SALES,
          permission: "SaleView",
          icon: FilePlus,
          description: "لیست فروش های ثبت شده",
        },
        {
          title: "ثبت فروش جدید",
          url: ROUTES.SALES_NEW,
          permission: ["SaleCreate", "SaleInPerson"],
          icon: FilePlus,
          description: "ثبت فاکتور فروش جدید",
        },
        {
          title: "ثبت مرجوعی از مشتری",
          url: ROUTES.SALES_RETURNS_NEW,
          permission: "SaleReturnCreate",
          icon: RotateCcw,
          description: "ثبت مرجوعی کالا از مشتری",
        },
        {
          title: "لیست مرجوعی‌ها",
          url: ROUTES.SALES_RETURNS_LIST,
          permission: "SaleReturnView",
          icon: List,
          description: "مشاهده لیست مرجوعی‌ها",
        },
      ],
    },
    {
      title: "گزارش‌ها",
      url: ROUTES.REPORTS,
      icon: BarChart3,
      isActive: false,
      items: [
        {
          title: "فعالیت کارمندان",
          url: ROUTES.REPORTS_EMPLOYEES,
          permission: "ReportView",
          icon: UserCog,
          description: "رتبه‌بندی کارمندان بر اساس فروش و خرید ثبت‌شده",
        },
        {
          title: "آمار خرید مشتریان",
          url: ROUTES.REPORTS_CUSTOMERS,
          permission: "ReportView",
          icon: Users,
          description: "پرخریدترین مشتریان و مانده‌ی تسویه‌نشده",
        },
        {
          title: "آمار خرید از تامین‌کنندگان",
          url: ROUTES.REPORTS_SUPPLIERS,
          permission: "ReportView",
          icon: Truck,
          description: "خرید از هر تامین‌کننده و وضعیت پرداخت",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "پشتیبانی",
      // url: ROUTES.FEEDBACK,
      icon: HelpCircle,
      description: "ارسال بازخورد و گزارش مشکل",
    },
    {
      title: "مستندات",
      // url: "/docs",
      icon: BookOpen,
      description: "مستندات و راهنما",
    },
  ],
  tools: [
  ],
  footerLinks: [
    {
      title: "راهنما",
      url: "/help",
      icon: HelpCircle,
    },
    {
      title: "قوانین",
      url: "/terms",
      icon: FileText,
    },
    {
      title: "حریم خصوصی",
      url: "/privacy",
      icon: Shield,
    },
    {
      title: "درباره ما",
      url: "/about",
      icon: Info,
    },
  ],
};
