import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Barcode,
  BookOpenText,
  Boxes,
  Undo2,
  Truck,
  User,
  ShoppingCart,
  Store,
  UserPlus,
} from "lucide-react";
import { ROUTES } from "@/shared/constants/routes";

/**
 * کارهایی که کاربر روزی چند بار از صفر شروع می‌کند.
 *
 * `permission` همان `handle.permission`ِ route مقصد است (همان شکل: یک
 * نام یا آرایه‌ای که *هرکدام* کافی است)، تا دکمه‌ای دیده نشود که به
 * صفحه‌ی «دسترسی ندارید» می‌رسد.
 *
 * فهرست عمداً فقط «شروعِ کار» است، نه هر صفحه‌ای: رفتن به فهرست‌ها کارِ
 * سایدبار است و تکرارش اینجا فقط دکمه‌ها را زیاد می‌کرد.
 */
export const QUICK_ACTIONS = [
  {
    id: "newSale",
    title: "فروش جدید",
    url: ROUTES.SALES_NEW,
    permission: ["SaleCreate", "SaleInPerson"],
    icon: Store,
  },
  {
    id: "newPurchase",
    title: "خرید جدید",
    url: ROUTES.PURCHASES_NEW,
    permission: "PurchaseCreate",
    icon: ShoppingCart,
  },
  {
    id: "receive",
    title: "دریافت کالا",
    url: ROUTES.WAREHOUSE_RECEIVING,
    permission: "PurchaseReceive",
    icon: ArrowDownToLine,
  },
  {
    id: "ship",
    title: "ارسال کالا",
    url: ROUTES.WAREHOUSE_SHIPPING,
    permission: "SaleShip",
    icon: ArrowUpFromLine,
  },
  {
    id: "newSaleReturn",
    title: "مرجوعی از فروش",
    url: ROUTES.SALES_RETURNS_NEW,
    permission: "SaleReturnCreate",
    icon: Undo2,
  },
  {
    id: "newPurchaseReturn",
    title: "مرجوعی از خرید",
    url: ROUTES.PURCHASES_RETURNS_NEW,
    permission: "PurchaseReturnCreate",
    icon: Undo2,
  },
  {
    id: "newCustomer",
    title: "مشتری جدید",
    url: ROUTES.CUSTOMERS_NEW,
    permission: "CustomerCreate",
    icon: UserPlus,
  },
    {
    id: "newSupplier",
    title: "تامین‌کننده جدید",
    url: ROUTES.SUPPLIERS_NEW,
    permission: "SupplierCreate",
    icon: Truck,
  },
  {
    id: "products",
    title: "لیست کالاها",
    url: ROUTES.WAREHOUSE_PRODUCTS,
    permission: "ProductView",
    icon: Boxes,
  },
  {
    id: "units",
    title: "دانه‌ها و برچسب",
    url: ROUTES.WAREHOUSE_UNITS,
    permission: "ProductUnitView",
    icon: Barcode,
  },
  {
    id: "employees",
    title: "کارمندان",
    url: ROUTES.EMPLOYEES_LIST,
    permission: "UserView",
    icon: User,
  },
  {
    id: "accounting",
    title: "دفتر حساب‌ها",
    url: ROUTES.ACCOUNTING,
    permission: "AccountingView",
    icon: BookOpenText,
  },
];

export const quickActionsFor = (context) =>
  QUICK_ACTIONS.filter((action) => context.can(action.permission));
