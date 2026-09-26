import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileClock,
  PackageSearch,
  RotateCcw,
  Undo2,
} from "lucide-react";
import { ROUTES } from "@/shared/constants/routes";
import {
  PurchaseStatusEnum,
  PURCHASE_STATUS_LABELS,
} from "@/shared/domain/enums/purchaseStatus";
import {
  SaleStatusEnum,
  SALE_STATUS_LABELS,
} from "@/shared/domain/enums/saleStatus";
import { RETURN_STATUSES } from "@/shared/domain/returns/statuses";
import { RECEIVING_AWAITING_STATUSES } from "@/features/warehouse/receiving/domain/receivingVocabulary";
import { SHIPPING_AWAITING_STATUSES } from "@/features/warehouse/shipping/domain/shippingVocabulary";

/**
 * صف‌های کاری — «چند چیز منتظرِ من است؟».
 *
 * هر صف روی همان فهرستی سوار است که صفحه‌ی خودش نشان می‌دهد و عددش
 * `total`ِ همان فهرست با `take=1` است؛ پس عددِ کاشی و تعدادِ سطرهای
 * صفحه‌ای که کاشی به آن می‌برد هرگز با هم فرق نمی‌کنند.
 *
 * هر وضعیت یک درخواستِ جدا است نه یک `statuses=`: `GetSaleList` هنوز
 * فیلترِ چندوضعیتی ندارد (`frontend-requests.fa.md` بخشِ ۳ بند ۸) و
 * سرورِ قدیمی آن پارامتر را نادیده می‌گیرد — یعنی `total`ِ *کلِ*
 * فروش‌ها، که عددِ غلطی است. `status`ِ تکی را هر دو فهرست می‌شناسند.
 *
 * `permissions` همه‌اش لازم است: صفِ دریافت هم به دسترسیِ صفحه
 * (`PurchaseReceive`) نیاز دارد و هم به دسترسیِ فهرستی که عدد از آن
 * می‌آید (`PurchaseView`). با یکی‌شان، کاشی یا ۴۰۳ می‌گرفت یا به صفحه‌ای
 * می‌برد که باز نمی‌شود.
 *
 * صف‌ها سازمانی‌اند، نه شخصی: هیچ‌کدام از این فهرست‌ها «ثبت‌شده توسطِ
 * من» را فیلتر نمی‌کند، و کارِ انبار هم به هر حال مالِ کلِ انبار است.
 */

const RETURN_OPEN_PARTS = [
  { status: RETURN_STATUSES.OPEN, label: "در انتظار تصمیم" },
  { status: RETURN_STATUSES.IN_PROGRESS, label: "در حال اجرا" },
];

export const WORK_QUEUES = [
  {
    id: "receive",
    title: "در انتظار دریافت",
    hint: "خریدهایی که کالایشان هنوز کامل به انبار نرسیده",
    icon: ArrowDownToLine,
    url: ROUTES.WAREHOUSE_RECEIVING,
    permissions: ["PurchaseReceive", "PurchaseView"],
    source: "purchase",
    parts: RECEIVING_AWAITING_STATUSES.map((status) => ({
      status,
      label: PURCHASE_STATUS_LABELS[status],
    })),
    tone: "sky",
  },
  {
    id: "ship",
    title: "در انتظار ارسال",
    hint: "فروش‌های صادرشده‌ای که کالایشان هنوز کامل از انبار خارج نشده",
    icon: ArrowUpFromLine,
    url: ROUTES.WAREHOUSE_SHIPPING,
    permissions: ["SaleShip", "SaleView"],
    source: "sale",
    parts: SHIPPING_AWAITING_STATUSES.map((status) => ({
      status,
      label: SALE_STATUS_LABELS[status],
    })),
    tone: "violet",
  },
  {
    id: "saleProforma",
    title: "پیش‌فاکتورهای فروش",
    hint: "فروش‌هایی که هنوز پرداختی ندارند و فاکتور رسمی نشده‌اند",
    icon: FileClock,
    url: ROUTES.SALES,
    // کارِ فروشنده است (پیگیریِ پرداخت)، نه هرکسی که فروش‌ها را می‌بیند —
    // انباردار برای دیدنِ صفِ ارسال `SaleView` دارد ولی کاری با پیش‌فاکتور ندارد.
    permissions: ["SaleView", "SaleCreate"],
    source: "sale",
    parts: [
      {
        status: SaleStatusEnum.PROFORMA,
        label: SALE_STATUS_LABELS[SaleStatusEnum.PROFORMA],
      },
    ],
    tone: "amber",
  },
  {
    id: "purchaseOpen",
    title: "خریدهای در جریان",
    hint: "خریدهایی که فاکتور رسمی‌شان نرسیده یا تامین‌کننده هنوز ارسال نکرده",
    icon: PackageSearch,
    url: ROUTES.PURCHASES,
    // همان استدلالِ پیش‌فاکتورِ فروش، سمتِ کارپرداز.
    permissions: ["PurchaseView", "PurchaseCreate"],
    source: "purchase",
    parts: [PurchaseStatusEnum.PROFORMA, PurchaseStatusEnum.PENDING].map(
      (status) => ({ status, label: PURCHASE_STATUS_LABELS[status] }),
    ),
    tone: "amber",
  },
  {
    id: "saleReturns",
    title: "مرجوعی‌های مشتری",
    hint: "مرجوعی‌های فروش که هنوز تسویه، رد یا لغو نشده‌اند",
    icon: Undo2,
    url: ROUTES.SALES_RETURNS_LIST,
    permissions: ["SaleReturnView"],
    source: "saleReturn",
    parts: RETURN_OPEN_PARTS,
    tone: "rose",
  },
  {
    id: "purchaseReturns",
    title: "مرجوعی به تامین‌کننده",
    hint: "مرجوعی‌های خرید که هنوز تسویه، رد یا لغو نشده‌اند",
    icon: RotateCcw,
    url: ROUTES.PURCHASES_RETURNS_LIST,
    permissions: ["PurchaseReturnView"],
    source: "purchaseReturn",
    parts: RETURN_OPEN_PARTS,
    tone: "rose",
  },
];

export const workQueuesFor = (context) =>
  WORK_QUEUES.filter((queue) => context.canAll(...queue.permissions));
