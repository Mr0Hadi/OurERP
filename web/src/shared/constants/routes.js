  // مسیرهای اصلی برنامه
  export const ROUTES = {

    // روت
    ROOT: '/',

    // دشبورد
    DASHBOARD: '/dashboard',
    
    // تامین کنندگان
    SUPPLIERS: '/suppliers',
    SUPPLIERS_LIST: '/suppliers',
    SUPPLIERS_NEW: '/suppliers/new',
    SUPPLIERS_EDIT: '/suppliers/edit/:id',
    SUPPLIERS_DETAIL: '/suppliers/:id',
    
    // مشتریان
    CUSTOMERS: '/customers',
    CUSTOMERS_LIST: '/customers',
    CUSTOMERS_NEW: '/customers/new',
    CUSTOMERS_EDIT: '/customers/edit/:id',
    CUSTOMERS_DETAIL: '/customers/:id',
    
    // محصولات/کالاها
    PRODUCTS: '/products',
    PRODUCTS_LIST: '/products',
    PRODUCTS_NEW: '/products/new',
    PRODUCTS_DETAIL: '/products/:id',
    
    // خرید
    PURCHASES: '/purchases',
    PURCHASES_NEW: '/purchases/new',
    PURCHASES_INVOICES: '/purchases/invoices',
    PURCHASES_INVOICE_DETAIL: '/purchases/invoices/:id',
    PURCHASES_RETURNS_NEW: '/purchases/returns/new',
    PURCHASES_RETURNS_LIST: '/purchases/returns',
    
    // فروش
    SALES: '/sales',
    SALES_NEW: '/sales/new',
    SALES_ORDERS: '/sales/orders',
    SALES_ORDER_DETAIL: '/sales/orders/:id',
    SALES_INVOICES_NEW: '/sales/invoices/new',
    SALES_PROFORMA: '/sales/proforma-invoice',
    SALES_RETURNS_NEW: '/sales/returns/new',
    SALES_RETURNS_LIST: '/sales/returns',
    
    // انبار
    INVENTORY: '/inventory',
    WAREHOUSE: '/warehouse',
    WAREHOUSE_PRODUCTS: '/warehouse/products',
    WAREHOUSE_PRODUCTS_NEW: '/warehouse/products/new',
    WAREHOUSE_STOCK: '/warehouse/stock',
    WAREHOUSE_TRANSACTIONS: '/warehouse/transactions',
    
    // فاکتورها
    INVOICE: '/invoice',
    INVOICE_LIST: '/invoice/list',
    INVOICE_NEW: '/invoice/new',
    INVOICE_DETAIL: '/invoice/:id',
    
    // تراکنش‌ها
    TRANSACTIONS: '/transactions',
    TRANSACTIONS_LIST: '/transactions',
    TRANSACTIONS_BUY_SELL: '/transactions/buy-sell',
    TRANSACTIONS_PAYMENTS: '/transactions/payments',
    TRANSACTIONS_RETURNS: '/transactions/returns',
    
    // گزارشات
    REPORTS: '/reports',
    REPORTS_SALES: '/reports/sales',
    REPORTS_PURCHASES: '/reports/purchases',
    REPORTS_FINANCIAL: '/reports/financial',
    REPORTS_PROFIT_LOSS: '/reports/profit-loss',
    REPORTS_INVENTORY: '/reports/inventory',
    
    // تنظیمات
    SETTINGS: '/settings',
    SETTINGS_GENERAL: '/settings/general',
    SETTINGS_COMPANY: '/settings/company',
    SETTINGS_INVOICE: '/settings/invoice',
    SETTINGS_TAX: '/settings/tax',
    SETTINGS_USERS: '/settings/users',
    SETTINGS_ROLES: '/settings/roles',
    SETTINGS_NOTIFICATIONS: '/settings/notifications',
    SETTINGS_BACKUP: '/settings/backup',
    
    // ابزارها
    TOOLS_NUMBER_TO_WORDS: '/tools/number-to-words',
    TOOLS_CALENDAR: '/tools/calendar',
    
    // پشتیبانی
    FEEDBACK: '/feedback',
    
    // احراز هویت
    AUTH: '/auth',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  };
