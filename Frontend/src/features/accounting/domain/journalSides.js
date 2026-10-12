import { ROUTES } from "@/shared/constants/routes";
import { SALE_STATUS_LABELS, SALE_STATUS_TONES } from "@/shared/domain/enums/saleStatus";
import { PURCHASE_STATUS_LABELS, PURCHASE_STATUS_TONES } from "@/shared/domain/enums/purchaseStatus";
import { DOCUMENT_PAYMENT_TYPE_LABELS, SALE_PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { DocumentSideEnum } from "./accountingEnums";

/**
 * واژگانِ دو دفترِ فاکتوری (فروش و خرید). دو دفتر یک جدول، یک فیلتر و یک صفحه دارند؛
 * فقط *نام‌ها* فرق می‌کند — نامِ فیلدِ طرف‌حساب و کاربر، وضعیت‌ها، مسیرِ سند و ستونِ
 * اختصاصی (سودِ اقساط در فروش، کسریِ بسته‌شده در خرید). هیچ محاسبه‌ای اینجا نیست.
 *
 * نام‌ها همان نام‌های بکند‌اند (`customerId`، `salesUserId`، …).
 */
const SALE = Object.freeze({
  side: DocumentSideEnum.SALE,
  title: "دفتر فروش",
  description: "هر فاکتورِ فروشِ صادرشده یک ردیف، با تاریخِ فاکتور. پیش‌فاکتور و لغوشده جز با فیلترِ وضعیت نمی‌آیند.",
  exportResource: "sale-journal",
  partyLabel: "مشتری",
  partyIdKey: "customerId",
  partyNameKey: "customerName",
  partyRoute: ROUTES.CUSTOMERS_DETAIL,
  userLabel: "فروشنده",
  userIdKey: "salesUserId",
  userNameKey: "salesUserName",
  documentRoute: ROUTES.SALES_DETAIL,
  statusLabels: SALE_STATUS_LABELS,
  statusTones: SALE_STATUS_TONES,
  paymentTypeLabels: SALE_PAYMENT_TYPE_LABELS,
  extraAmount: { key: "installmentChargeAmount", label: "سود اقساط" },
  emptyMessage: "فاکتورِ فروشی با این فیلترها نیست.",
});

const PURCHASE = Object.freeze({
  side: DocumentSideEnum.PURCHASE,
  title: "دفتر خرید",
  description: "هر فاکتورِ خرید یک ردیف، با تاریخِ فاکتور. «قابل پرداخت» سهمِ اقلامِ بسته‌شده با کسری را ندارد.",
  exportResource: "purchase-journal",
  partyLabel: "تامین‌کننده",
  partyIdKey: "supplierId",
  partyNameKey: "supplierName",
  partyRoute: ROUTES.SUPPLIERS_DETAIL,
  userLabel: "کارمندِ خرید",
  userIdKey: "purchasingUserId",
  userNameKey: "purchasingUserName",
  documentRoute: ROUTES.PURCHASES_DETAIL,
  statusLabels: PURCHASE_STATUS_LABELS,
  statusTones: PURCHASE_STATUS_TONES,
  paymentTypeLabels: DOCUMENT_PAYMENT_TYPE_LABELS,
  extraAmount: { key: "shortClosedAmount", label: "کسریِ بسته‌شده" },
  emptyMessage: "فاکتورِ خریدی با این فیلترها نیست.",
});

export const JOURNAL_SIDES = Object.freeze({
  [DocumentSideEnum.SALE]: SALE,
  [DocumentSideEnum.PURCHASE]: PURCHASE,
});
