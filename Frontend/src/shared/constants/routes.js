export const ROUTES = {
  // روت
  ROOT: "/",

  // دشبورد
  DASHBOARD: "/dashboard",

  // تامین کنندگان
  SUPPLIERS: "/suppliers",
  SUPPLIERS_LIST: "/suppliers",
  SUPPLIERS_NEW: "/suppliers/new",
  SUPPLIERS_EDIT: "/suppliers/edit/:id",
  SUPPLIERS_DETAIL: "/suppliers/:id",

  // مشتریان
  CUSTOMERS: "/customers",
  CUSTOMERS_LIST: "/customers",
  CUSTOMERS_NEW: "/customers/new",
  CUSTOMERS_DETAIL: "/customers/:id",

  // کارمندان (کاربران سیستم — نه مشتری و نه تامین‌کننده)
  EMPLOYEES: "/employees",
  EMPLOYEES_LIST: "/employees",
  EMPLOYEES_NEW: "/employees/new",
  EMPLOYEES_DETAIL: "/employees/:id",

  // ساختار سازمانی — واحدها و تیم‌ها
  ORGANIZATION: "/organization",
  ORG_DEPARTMENTS: "/organization/departments",
  ORG_DEPARTMENTS_NEW: "/organization/departments/new",
  ORG_DEPARTMENTS_DETAIL: "/organization/departments/:id",
  ORG_TEAMS: "/organization/teams",
  ORG_TEAMS_NEW: "/organization/teams/new",
  ORG_TEAMS_DETAIL: "/organization/teams/:id",

  // سطح دسترسی — دسترسیِ کارمندان و الگوی پیشنهادیِ هر واحد
  ACCESS: "/access",
  ACCESS_USERS: "/access/users",
  ACCESS_USERS_DETAIL: "/access/users/:id",
  ACCESS_TEMPLATES: "/access/templates",
  ACCESS_TEMPLATES_DETAIL: "/access/templates/:id",

  // خرید
  PURCHASES: "/purchases",
  PURCHASES_DETAIL: "/purchases/:id",
  PURCHASES_NEW: "/purchases/new",
  PURCHASES_RETURNS_DETAIL: "/purchases/returns/:id",
  PURCHASES_RETURNS_NEW: "/purchases/returns/new",
  PURCHASES_RETURNS_LIST: "/purchases/returns",

  // فروش
  SALES: "/sales",
  SALES_NEW: "/sales/new",
  SALES_DETAIL: "/sales/:id",
  // نشانی‌های قدیمی؛ به خزانه‌داری هدایت می‌شوند.
  LEGACY_SALES_INSTALLMENTS: "/sales/installments",
  LEGACY_SALES_CASHIER: "/sales/cashier",

  // خزانه‌داری: صندوق، اقساط، و (بعداً) حساب‌های بانک/صندوق، دریافت‌ها و انتقال‌ها.
  TREASURY: "/treasury",
  TREASURY_CASHIER: "/treasury/cashier",
  TREASURY_CASHIER_DETAIL: "/treasury/cashier/:id",
  TREASURY_INSTALLMENTS: "/treasury/installments",
  SALES_RETURNS_NEW: "/sales/returns/new",
  SALES_RETURNS_LIST: "/sales/returns",
  SALES_RETURNS_DETAIL: "/sales/returns/:id",

  // انبار
  WAREHOUSE: "/warehouse",
  WAREHOUSE_PRODUCTS: "/warehouse/products",
  WAREHOUSE_PRODUCTS_DETAIL: "/warehouse/products/:id",
  WAREHOUSE_PRODUCTS_NEW: "/warehouse/products/new",
  WAREHOUSE_UNITS: "/warehouse/units",
  WAREHOUSE_UNIT_LABELS: "/warehouse/unit-labels",
  WAREHOUSE_CATEGORIES: "/warehouse/categories",
  WAREHOUSE_CATEGORIES_DETAIL: "/warehouse/categories/:id",
  WAREHOUSE_VEHICLES: "/warehouse/vehicles",
  WAREHOUSE_VEHICLES_DETAIL: "/warehouse/vehicles/:id",
  WAREHOUSE_STOCK: "/warehouse/stock",
  WAREHOUSE_TRANSACTIONS: "/warehouse/transactions",
  WAREHOUSE_RECEIVING: "/warehouse/receiving",
  WAREHOUSE_RECEIVING_DETAIL: "/warehouse/receiving/:id",
  WAREHOUSE_SHIPPING: "/warehouse/shipping",
  // بررسیِ انبارِ پیش‌فاکتورِ فروش (اسکن و رزرو، پیش از پرداخت).
  WAREHOUSE_SALE_CHECK: "/warehouse/sale-check",
  WAREHOUSE_SALE_CHECK_DETAIL: "/warehouse/sale-check/:id",
  WAREHOUSE_SHIPPING_DETAIL: "/warehouse/shipping/:id",
  WAREHOUSE_RECEIVING_RETURN_DETAIL: "/warehouse/receiving/returns/:id",
  WAREHOUSE_SHIPPING_RETURN_DETAIL: "/warehouse/shipping/returns/:id",


  // فاکتورها
  INVOICE: "/invoice",
  INVOICE_LIST: "/invoice/list",
  INVOICE_NEW: "/invoice/new",

  // تراکنش‌ها
  TRANSACTIONS: "/transactions",
  TRANSACTIONS_BUY_SELL: "/transactions/buy-sell",
  TRANSACTIONS_PAYMENTS: "/transactions/payments",
  TRANSACTIONS_RETURNS: "/transactions/returns",

  // حسابداری — داشبورد و دفترهای `api/Accounting` (بخش ۲۰ سند)، همه فقط‌خواندنی.
  ACCOUNTING: "/accounting",
  ACCOUNTING_PARTIES: "/accounting/parties",
  ACCOUNTING_PARTY_LEDGER: "/accounting/party-ledger",
  ACCOUNTING_SALES: "/accounting/sales",
  ACCOUNTING_PURCHASES: "/accounting/purchases",
  ACCOUNTING_SALE_LINES: "/accounting/sale-lines",
  ACCOUNTING_PAYMENTS: "/accounting/payments",
  // گزارش‌های دانه‌ی معیوب/مفقودِ بررسیِ انبار، منتظرِ تصمیمِ حسابداری.
  ACCOUNTING_WAREHOUSE_ISSUES: "/accounting/warehouse-issues",
  ACCOUNTING_TAX: "/accounting/tax",
  ACCOUNTING_INVENTORY: "/accounting/inventory",
  ACCOUNTING_BREAKDOWN: "/accounting/breakdown",
  // گزارش‌های فعالیت (`api/Report`، بخش ۱۸) — پیش‌تر بخشِ جدای «گزارش‌ها».
  ACCOUNTING_EMPLOYEES: "/accounting/employees",
  ACCOUNTING_CUSTOMERS: "/accounting/customers",
  ACCOUNTING_SUPPLIERS: "/accounting/suppliers",

  // نشانیِ قدیمیِ بخشِ «گزارش‌ها»؛ به حسابداری هدایت می‌شود (پیوندهای ذخیره‌شده نشکنند).
  REPORTS: "/reports",

  // تاریخچه‌ی تغییرات — کارهای کاربران (`api/Audit`، بخش ۲۱ سند)، فقط‌خواندنی.
  AUDIT: "/audit",
  AUDIT_DETAIL: "/audit/:id",

  // تنظیمات
  SETTINGS: "/settings",
  SETTINGS_GENERAL: "/settings/general",
  SETTINGS_COMPANY: "/settings/company",
  SETTINGS_INVOICE: "/settings/invoice",
  SETTINGS_TAX: "/settings/tax",
  SETTINGS_USERS: "/settings/users",
  SETTINGS_ROLES: "/settings/roles",
  SETTINGS_NOTIFICATIONS: "/settings/notifications",
  SETTINGS_BACKUP: "/settings/backup",

  // ابزارها
  TOOLS_NUMBER_TO_WORDS: "/tools/number-to-words",
  TOOLS_CALENDAR: "/tools/calendar",

  // پشتیبانی
  FEEDBACK: "/feedback",

  // احراز هویت
  AUTH: "/auth",
  LOGIN: "/auth/login",
};

/**
 * آدرسِ یک رکورد از الگوی مسیر: `routeWithId(ROUTES.CUSTOMERS_DETAIL, 5)` → `/customers/5`.
 *
 * جای template stringهای دستی (`\`/customers/${id}\``) و `.replace(":id", …)` که
 * با هر تغییرِ مسیر باید جداگانه پیدا و عوض می‌شدند.
 */
export function routeWithId(pattern, id) {
  return pattern.replace(":id", encodeURIComponent(String(id)));
}
