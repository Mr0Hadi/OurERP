import { ROUTES } from "./routes";

// Icons from lucide-react
import {
  // Navigation
  Home,
  Settings,
  SettingsIcon,
  UserCog,
  Bell,
  HelpCircle,

  // Business
  Store,
  ShoppingCart,
  Truck,
  Warehouse,
  Package,
  Box,
  Users,

  // Documents
  FileText,
  FilePlus,
  ClipboardList,
  Receipt,
  QrCode,
  Barcode,

  // Financial
  DollarSign,
  CreditCard,
  Percent,
  TrendingUp,
  TrendingDown,
  Calculator,

  // Reports
  BarChart3,
  List,
  BookOpen,

  // Actions
  PlusCircle,
  RotateCcw,
  Download,
  Calendar,

  // Info
  Info,
  Shield,

  // Company
  Building2,
} from "lucide-react";

export const navigationData = {
  user: {
    name: "هادی",
    email: "hadi@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "واحد فروش",
      logo: Store,
      plan: "تیم فروش",
      permissions: [
        "sales",
        "customers",
        "reports_sales",
        "sales_create",
        "sales_view",
        "sales_edit",
        "sales_delete",
      ],
      description: "مدیریت فروش و مشتریان",
      color: "bg-blue-500",
    },
    {
      name: "واحد خرید",
      logo: ShoppingCart,
      plan: "تیم خرید",
      permissions: [
        "purchases",
        "suppliers",
        "reports_purchases",
        "purchases_create",
        "purchases_view",
        "purchases_edit",
        "purchases_delete",
      ],
      description: "مدیریت خرید و تامین کنندگان",
      color: "bg-green-500",
    },
    {
      name: "واحد انبارداری",
      logo: Warehouse,
      plan: "تیم انبار",
      permissions: [
        "inventory",
        "warehouse",
        "inventory_view",
        "inventory_create",
        "inventory_edit",
        "inventory_delete",
        "inventory_stock",
      ],
      description: "مدیریت انبار و کالاها",
      color: "bg-yellow-500",
    },
    // {
    //   name: "واحد حسابداری",
    //   logo: DollarSign,
    //   plan: "تیم حسابداری",
    //   permissions: [
    //     "reports_financial",
    //     "reports_profit_loss",
    //     "transactions",
    //     "invoice",
    //     "reports_all",
    //   ],
    //   description: "مدیریت مالی و حسابداری",
    //   color: "bg-purple-500",
    // },
    {
      name: "ادمین کل",
      logo: Shield,
      plan: "مدیریت سیستم",
      permissions: ["all"],
      description: "دسترسی کامل به تمام بخش‌ها",
      color: "bg-red-500",
    },
  ],
  navMain: [
    {
      title: "داشبورد",
      url: ROUTES.DASHBOARD,
      icon: Home,
      isActive: false,
      permission: "dashboard",
      items: [],
    },
    {
      title: "تامین کنندگان",
      url: ROUTES.SUPPLIERS,
      icon: Truck,
      isActive: false,
      permission: "suppliers",
      items: [
        {
          title: "لیست تامین کنندگان",
          url: ROUTES.SUPPLIERS_LIST,
          permission: "suppliers_view",
          icon: List,
          description: "مشاهده و جستجوی تامین کنندگان",
        },
        {
          title: "اضافه کردن تامین کننده",
          url: ROUTES.SUPPLIERS_NEW,
          permission: "suppliers_create",
          icon: PlusCircle,
          description: "ثبت تامین کننده جدید",
        },
        {
          title: "گزارشات تامین کنندگان",
          url: ROUTES.REPORTS_PURCHASES,
          permission: "reports_purchases",
          icon: BarChart3,
          description: "گزارشات خرید از تامین کنندگان",
        },
      ],
    },
    {
      title: "مشتریان",
      url: ROUTES.CUSTOMERS,
      icon: Users,
      isActive: false,
      permission: "customers",
      items: [
        {
          title: "لیست مشتریان",
          url: ROUTES.CUSTOMERS_LIST,
          permission: "customers_view",
          icon: List,
          description: "مشاهده و جستجوی مشتریان",
        },
        {
          title: "اضافه کردن مشتری جدید",
          url: ROUTES.CUSTOMERS_NEW,
          permission: "customers_create",
          icon: PlusCircle,
          description: "ثبت مشتری جدید",
        },
        {
          title: "گزارشات مشتریان",
          url: ROUTES.REPORTS_SALES,
          permission: "reports_sales",
          icon: BarChart3,
          description: "گزارشات فروش به مشتریان",
        },
      ],
    },
    {
      title: "محصولات",
      url: ROUTES.PRODUCTS,
      icon: Package,
      isActive: false,
      permission: "inventory",
      items: [
        {
          title: "لیست کالاها",
          url: ROUTES.PRODUCTS_LIST,
          permission: "inventory_view",
          icon: Box,
          description: "مشاهده و جستجوی کالاها",
        },
        {
          title: "تعریف کالای جدید",
          url: ROUTES.PRODUCTS_NEW,
          permission: "inventory_create",
          icon: PlusCircle,
          description: "ثبت کالای جدید",
        }
      ],
    },
    {
      title: "خرید",
      url: ROUTES.PURCHASES,
      icon: ShoppingCart,
      isActive: false,
      permission: "purchases",
      items: [
        {
          title: "ثبت خرید جدید",
          url: ROUTES.PURCHASES_NEW,
          permission: "purchases_create",
          icon: FilePlus,
          description: "ثبت فاکتور خرید جدید",
        },
        {
          title: "لیست فاکتورهای خرید",
          url: ROUTES.PURCHASES_INVOICES,
          permission: "purchases_view",
          icon: Receipt,
          description: "مشاهده فاکتورهای خرید",
        },
        {
          title: "ثبت مرجوعی به تامین‌کننده",
          url: ROUTES.PURCHASES_RETURNS_NEW,
          permission: "purchases_returns",
          icon: RotateCcw,
          description: "ثبت مرجوعی کالا به تامین کننده",
        },
        {
          title: "لیست مرجوعی‌ها",
          url: ROUTES.PURCHASES_RETURNS_LIST,
          permission: "purchases_returns",
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
      permission: "sales",
      items: [
        {
          title: "ثبت فروش جدید",
          url: ROUTES.SALES_NEW,
          permission: "sales_create",
          icon: FilePlus,
          description: "ثبت فاکتور فروش جدید",
        },
        {
          title: "لیست سفارشات فروش",
          url: ROUTES.SALES_ORDERS,
          permission: "sales_view",
          icon: ClipboardList,
          description: "مشاهده سفارشات فروش",
        },
        {
          title: "ثبت فاکتور فروش به مشتری",
          url: ROUTES.SALES_INVOICES_NEW,
          permission: "sales_invoice",
          icon: Receipt,
          description: "صدور فاکتور فروش نهایی",
        },
        {
          title: "ساخت پیش فاکتور",
          url: ROUTES.SALES_PROFORMA,
          permission: "sales_proforma",
          icon: FileText,
          description: "ایجاد پیش فاکتور برای مشتری",
        },
        {
          title: "ثبت مرجوعی از مشتری",
          url: ROUTES.SALES_RETURNS_NEW,
          permission: "sales_returns",
          icon: RotateCcw,
          description: "ثبت مرجوعی کالا از مشتری",
        },
        {
          title: "لیست مرجوعی‌ها",
          url: ROUTES.SALES_RETURNS_LIST,
          permission: "sales_returns",
          icon: List,
          description: "مشاهده لیست مرجوعی‌ها",
        },
      ],
    },
    // {
    //   title: "انبار",
    //   url: ROUTES.WAREHOUSE,
    //   icon: Warehouse,
    //   isActive: false,
    //   permission: "warehouse",
    //   items: [
    //     {
    //       title: "لیست کالاها",
    //       url: ROUTES.WAREHOUSE_PRODUCTS,
    //       permission: "inventory_view",
    //       icon: Package,
    //       description: "مشاهده کالاهای انبار",
    //     },
    //     {
    //       title: "تعریف کالای جدید",
    //       url: ROUTES.WAREHOUSE_PRODUCTS_NEW,
    //       permission: "inventory_create",
    //       icon: PlusCircle,
    //       description: "افزودن کالای جدید",
    //     },
    //     {
    //       title: "موجودی انبار",
    //       url: ROUTES.WAREHOUSE_STOCK,
    //       permission: "inventory_stock",
    //       icon: BarChart3,
    //       description: "مشاهده موجودی دقیق",
    //     },
    //     {
    //       title: "تراکنش‌های انبار",
    //       url: ROUTES.WAREHOUSE_TRANSACTIONS,
    //       permission: "inventory_stock",
    //       icon: ClipboardList,
    //       description: "مشاهده ورود و خروج کالا",
    //     },
    //   ],
    // },
    {
      title: "فاکتورها",
      url: ROUTES.INVOICE,
      icon: FileText,
      isActive: false,
      permission: "invoice",
      items: [
        {
          title: "لیست فاکتورها",
          url: ROUTES.INVOICE_LIST,
          permission: "invoice_view",
          icon: List,
          description: "مشاهده تمام فاکتورها",
        },
        {
          title: "فاکتور جدید",
          url: ROUTES.INVOICE_NEW,
          permission: "invoice_create",
          icon: FilePlus,
          description: "ایجاد فاکتور جدید",
        },
      ],
    },
    // {
    //   title: "تراکنش‌ها",
    //   url: ROUTES.TRANSACTIONS,
    //   icon: CreditCard,
    //   isActive: false,
    //   permission: "transactions",
    //   items: [
    //     {
    //       title: "همه تراکنش‌ها",
    //       url: ROUTES.TRANSACTIONS_LIST,
    //       permission: "transactions_view",
    //       icon: List,
    //       description: "مشاهده تمام تراکنش‌ها",
    //     },
    //     {
    //       title: "خرید و فروش",
    //       url: ROUTES.TRANSACTIONS_BUY_SELL,
    //       permission: "transactions_view",
    //       icon: TrendingUp,
    //       description: "تراکنش‌های خرید و فروش",
    //     },
    //     {
    //       title: "دریافت و پرداخت",
    //       url: ROUTES.TRANSACTIONS_PAYMENTS,
    //       permission: "transactions_view",
    //       icon: DollarSign,
    //       description: "دریافت و پرداخت‌ها",
    //     },
    //   ],
    // },
    {
      title: "گزارشات",
      url: ROUTES.REPORTS,
      icon: BarChart3,
      isActive: false,
      permission: "reports",
      items: [
        {
          title: "گزارشات فروش",
          url: ROUTES.REPORTS_SALES,
          permission: "reports_sales",
          icon: TrendingUp,
          description: "گزارشات تحلیلی فروش",
        },
        {
          title: "گزارشات خرید",
          url: ROUTES.REPORTS_PURCHASES,
          permission: "reports_purchases",
          icon: TrendingDown,
          description: "گزارشات تحلیلی خرید",
        },
        {
          title: "گزارشات مالی",
          url: ROUTES.REPORTS_FINANCIAL,
          permission: "reports_financial",
          icon: DollarSign,
          description: "گزارشات مالی و حسابداری",
        },
        {
          title: "سود و زیان",
          url: ROUTES.REPORTS_PROFIT_LOSS,
          permission: "reports_profit_loss",
          icon: TrendingUp,
          description: "گزارش سود و زیان",
        },
        {
          title: "گزارشات انبار",
          url: ROUTES.REPORTS_INVENTORY,
          permission: "reports_inventory",
          icon: Package,
          description: "گزارشات موجودی انبار",
        },
      ],
    },
    {
      title: "تنظیمات",
      url: ROUTES.SETTINGS,
      icon: Settings,
      isActive: false,
      permission: "settings",
      items: [
        {
          title: "تنظیمات عمومی",
          url: ROUTES.SETTINGS_GENERAL,
          permission: "settings_general",
          icon: SettingsIcon,
          description: "تنظیمات کلی سیستم",
        },
        {
          title: "پروفایل شرکت",
          url: ROUTES.SETTINGS_COMPANY,
          permission: "settings_company",
          icon: Building2,
          description: "اطلاعات شرکت",
        },
        {
          title: "تنظیمات فاکتور",
          url: ROUTES.SETTINGS_INVOICE,
          permission: "settings_invoice",
          icon: FileText,
          description: "تنظیمات چاپ فاکتور",
        },
        {
          title: "تنظیمات مالیات",
          url: ROUTES.SETTINGS_TAX,
          permission: "settings_tax",
          icon: Percent,
          description: "تنظیمات مالیاتی",
        },
        {
          title: "مدیریت کاربران",
          url: ROUTES.SETTINGS_USERS,
          permission: "settings_users",
          icon: UserCog,
          description: "مدیریت کاربران سیستم",
        },
        {
          title: "نقش‌ها و دسترسی‌ها",
          url: ROUTES.SETTINGS_ROLES,
          permission: "settings_roles",
          icon: Shield,
          description: "تعریف نقش‌ها و مجوزها",
        },
        {
          title: "اعلان‌ها",
          url: ROUTES.SETTINGS_NOTIFICATIONS,
          permission: "settings_notifications",
          icon: Bell,
          description: "تنظیمات اعلان‌ها",
        },
        {
          title: "پشتیبان‌گیری",
          url: ROUTES.SETTINGS_BACKUP,
          permission: "settings_backup",
          icon: Download,
          description: "تهیه پشتیبان از داده‌ها",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "پشتیبانی",
      url: ROUTES.FEEDBACK,
      icon: HelpCircle,
      permission: "support",
      description: "ارسال بازخورد و گزارش مشکل",
    },
    {
      title: "مستندات",
      url: "/docs",
      icon: BookOpen,
      permission: "all",
      description: "مستندات و راهنما",
    },
  ],
  tools: [
    {
      name: "تبدیل رقم به حروف",
      url: ROUTES.TOOLS_NUMBER_TO_WORDS,
      icon: Calculator,
      permission: "tools",
      description: "تبدیل اعداد به حروف فارسی",
    },
    {
      name: "تقویم",
      url: ROUTES.TOOLS_CALENDAR,
      icon: Calendar,
      permission: "tools",
      description: "تقویم شمسی و قمری",
    },
    {
      name: "ماشین حساب",
      url: "/tools/calculator",
      icon: Calculator,
      permission: "tools",
      description: "ماشین حساب علمی",
    },
    {
      name: "بارکد ساز",
      url: "/tools/barcode",
      icon: Barcode,
      permission: "tools",
      description: "ساخت بارکد برای کالاها",
    },
    {
      name: "QR Code ساز",
      url: "/tools/qrcode",
      icon: QrCode,
      permission: "tools",
      description: "ساخت QR Code",
    },
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

export const getFilteredNavigation = (userPermissions) => {
  const filterByPermission = (items) => {
    if (!items) return [];

    return items.filter((item) => {
      if (!item.permission) return true;
      if (userPermissions.includes("all")) return true;
      if (item.permission === "all") return true;

      // بررسی دسترسی برای آیتم اصلی
      const hasAccess = userPermissions.includes(item.permission);

      // اگر آیتم زیرمنو دارد، زیرمنوها را هم فیلتر کن
      if (item.items && item.items.length > 0) {
        item.items = item.items.filter((subItem) => {
          if (!subItem.permission) return true;
          return userPermissions.includes(subItem.permission);
        });
      }

      return hasAccess;
    });
  };

  return {
    user: navigationData.user,
    teams: navigationData.teams,
    navMain: filterByPermission([...navigationData.navMain]),
    navSecondary: filterByPermission([...navigationData.navSecondary]),
    tools: filterByPermission([...navigationData.tools]),
    footerLinks: navigationData.footerLinks,
  };
};
