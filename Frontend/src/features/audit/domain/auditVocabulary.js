import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { DOCUMENT_KIND_LABELS, documentRouteOf } from "@/shared/domain/enums/documentKind";
import { PAYMENT_PURPOSE_LABELS, PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { PRODUCT_UNIT_LABELS } from "@/shared/domain/enums/productUnit";
import { PURCHASE_STATUS_LABELS } from "@/shared/domain/enums/purchaseStatus";
import {
  INSTALLMENT_PLAN_STATUS_LABELS,
  INSTALLMENT_STATUS_LABELS,
} from "@/shared/domain/enums/saleInstallment";
import { SALE_STATUS_LABELS } from "@/shared/domain/enums/saleStatus";
import { TAX_CATEGORY_LABELS } from "@/shared/domain/enums/taxCategory";
import { UNIT_STATUS_LABELS } from "@/shared/domain/enums/unitStatus";
import { gregorianToPersianDateTime, toDateOnly } from "@/shared/lib/dateUtils";
import { formatDigits, formatNumber } from "@/shared/lib/numberFormat";

/**
 * واژگانِ تاریخچه: سرور نامِ کلاس (`SaleItem`) و نامِ ستون (`PaidAmount`) را همان‌طور که در
 * کد است می‌فرستد و مقدارها را همان‌طور که ذخیره شده (enum عدد، تاریخ متنِ ISO). این‌جا فقط
 * *نمایش* است؛ نامِ ناشناخته همان نامِ انگلیسی می‌ماند تا جدولِ تازه‌ی بکند هم دیده شود.
 */

// ─── نوعِ سطر ────────────────────────────────────────────────────────────────

export const AUDIT_ENTITY_LABELS = Object.freeze({
  User: "کاربر",
  UserPermission: "دسترسی کاربر",
  Department: "واحد سازمانی",
  DepartmentPermissionTemplate: "الگوی دسترسی واحد",
  Team: "تیم",
  Customer: "مشتری",
  Supplier: "تامین‌کننده",
  Product: "کالا",
  ProductCategory: "دسته‌بندی کالا",
  ProductUnit: "دانه‌ی کالا",
  ProductVehicle: "کالای خودرو",
  Vehicle: "خودرو",
  PosTerminal: "کارت‌خوان",
  DocumentAttachment: "پیوست",
  Purchase: "خرید",
  PurchaseItem: "ردیف خرید",
  PurchaseDriver: "راننده‌ی خرید",
  PurchaseReceivingDiscrepancy: "مغایرت دریافت",
  PurchaseReceivingImage: "تصویر دریافت",
  PurchaseReceivingNote: "یادداشت دریافت",
  PurchaseReturn: "مرجوعی خرید",
  PurchaseReturnClaim: "ادعای مرجوعی خرید",
  PurchaseReturnResolution: "تصمیم مرجوعی خرید",
  PurchaseReturnEffect: "اثر مرجوعی خرید",
  PurchaseReturnEffectMoneyPart: "بخش مالی اثر مرجوعی خرید",
  PurchaseReturnEffectObservation: "مشاهده‌ی مرجوعی خرید",
  PurchaseReturnEffectRound: "دور جابه‌جایی مرجوعی خرید",
  Sale: "فروش",
  SaleItem: "ردیف فروش",
  SaleDriver: "راننده‌ی فروش",
  SaleShippingNote: "یادداشت ارسال",
  SaleProformaStageEvent: "مرحله‌ی پیش‌فاکتور",
  SaleWarehouseIssue: "گزارش انبار",
  SaleInstallmentPlan: "طرح اقساط",
  SaleInstallment: "قسط",
  SaleReturn: "مرجوعی فروش",
  SaleReturnClaim: "ادعای مرجوعی فروش",
  SaleReturnResolution: "تصمیم مرجوعی فروش",
  SaleReturnEffect: "اثر مرجوعی فروش",
  SaleReturnEffectMoneyPart: "بخش مالی اثر مرجوعی فروش",
  SaleReturnEffectObservation: "مشاهده‌ی مرجوعی فروش",
  SaleReturnEffectRound: "دور جابه‌جایی مرجوعی فروش",
  PaymentDetail: "پرداخت",
});

export const entityLabelOf = (entityType) => AUDIT_ENTITY_LABELS[entityType] ?? entityType;

/**
 * نوع‌هایی که به هیچ سندی تعلق ندارند و `GetEntityHistory` برایشان معنا دارد — گزینه‌های
 * فیلترِ «نوع رکورد» در گزارشِ فعالیت.
 */
export const STANDALONE_ENTITY_TYPES = Object.freeze([
  "Customer",
  "Supplier",
  "Product",
  "ProductCategory",
  "ProductUnit",
  "Vehicle",
  "User",
  "UserPermission",
  "Department",
  "DepartmentPermissionTemplate",
  "Team",
  "PosTerminal",
]);

const ENTITY_ROUTES = {
  Customer: ROUTES.CUSTOMERS_DETAIL,
  Supplier: ROUTES.SUPPLIERS_DETAIL,
  Product: ROUTES.WAREHOUSE_PRODUCTS_DETAIL,
  ProductCategory: ROUTES.WAREHOUSE_CATEGORIES_DETAIL,
  Vehicle: ROUTES.WAREHOUSE_VEHICLES_DETAIL,
  User: ROUTES.EMPLOYEES_DETAIL,
  Department: ROUTES.ORG_DEPARTMENTS_DETAIL,
  Team: ROUTES.ORG_TEAMS_DETAIL,
};

/**
 * پیوندِ «برو به رکورد» برای یک تغییر: سند اگر به سندی تعلق دارد، وگرنه صفحه‌ی خودِ سطر
 * (فقط کلیدِ تک‌بخشی). حذف‌شده‌ها پیوند ندارند — صفحه‌شان دیگر وجود ندارد.
 */
export function changeTargetOf(change) {
  if (change.documentKind && change.documentId) {
    return {
      label: `${DOCUMENT_KIND_LABELS[change.documentKind] ?? "سند"} ${formatDigits(change.documentId)}`,
      to: documentRouteOf(change.documentKind, change.documentId),
    };
  }
  const pattern = ENTITY_ROUTES[change.entityType];
  const singleKey = /^\d+$/.test(change.entityKey ?? "");
  return {
    label: `${entityLabelOf(change.entityType)} ${singleKey ? formatDigits(change.entityKey) : change.entityKey}`,
    to: pattern && singleKey && change.operation !== 3 ? routeWithId(pattern, change.entityKey) : null,
  };
}

// ─── نامِ ستون ───────────────────────────────────────────────────────────────

export const AUDIT_FIELD_LABELS = Object.freeze({
  Id: "شناسه",
  Name: "نام",
  EnglishName: "نام انگلیسی",
  Title: "عنوان",
  FirstName: "نام",
  LastName: "نام خانوادگی",
  CompanyName: "نام شرکت",
  Username: "نام کاربری",
  PasswordHash: "رمز عبور",
  MustChangePassword: "الزام تغییر رمز",
  FailedLoginCount: "ورود ناموفق",
  LockoutEnd: "پایان قفل حساب",
  PersonelCode: "کد پرسنلی",
  NationalId: "کد ملی",
  EconomicCode: "کد اقتصادی",
  RegistrationNumber: "شماره ثبت",
  PhoneNumber: "شماره تلفن",
  Phone: "تلفن",
  Address: "نشانی",
  Province: "استان",
  City: "شهر",
  PostalCode: "کد پستی",
  Latitude: "عرض جغرافیایی",
  Longitude: "طول جغرافیایی",
  ImageUrl: "تصویر",
  Description: "توضیحات",
  Note: "یادداشت",
  IsActive: "فعال",
  Status: "وضعیت",
  StatusReason: "دلیل وضعیت",
  Reason: "دلیل",
  Type: "نوع",
  Kind: "نوع",
  Code: "کد",
  Brand: "برند",
  Barcode: "بارکد",
  BarCode: "بارکد",
  SupplierBarCode: "بارکد تامین‌کننده",
  Unit: "واحد",
  Stock: "موجودی",
  LowStockThreshold: "حد هشدار موجودی",
  MarkupPercentage: "درصد سود",
  TaxCategory: "دسته‌ی مالیاتی",
  TaxPercent: "درصد مالیات",
  Tax: "مالیات",
  RequiresUnitTracking: "ردیابی دانه‌ای",
  BalanceType: "نوع مانده",
  Balance: "مانده",
  InvoiceNumber: "شماره فاکتور",
  InvoiceDate: "تاریخ فاکتور",
  PaymentDate: "مهلت پرداخت",
  PaymentType: "روش پرداخت",
  TotalAmount: "مبلغ کل",
  PaidAmount: "مبلغ پرداخت‌شده",
  Amount: "مبلغ",
  Discount: "تخفیف",
  Quantity: "تعداد",
  UnitPrice: "قیمت واحد",
  Price: "قیمت",
  UnitCost: "بهای واحد",
  ReceivedQuantity: "تعداد دریافت‌شده",
  ShippedQuantity: "تعداد ارسال‌شده",
  AppliedQuantity: "تعداد اجراشده",
  HealthyQuantity: "تعداد سالم",
  RestockedQuantity: "تعداد برگشت به انبار",
  SettledQuantity: "تعداد تسویه‌شده",
  ShortClosedQuantity: "تعداد بسته‌شده",
  Revision: "نسخه",
  ProformaStage: "مرحله‌ی پیش‌فاکتور",
  CustomerId: "مشتری",
  SupplierId: "تامین‌کننده",
  ProductId: "کالا",
  ProductCategoryId: "دسته‌بندی",
  VehicleId: "خودرو",
  UserId: "کاربر",
  SalesUserId: "فروشنده",
  PurchasingUserId: "کارمند خرید",
  RecordedByUserId: "ثبت‌کننده",
  DepartmentId: "واحد",
  TeamId: "تیم",
  HeadId: "مدیر",
  DeputyId: "معاون",
  SaleId: "فروش",
  PurchaseId: "خرید",
  PosTerminalId: "کارت‌خوان",
  Permission: "دسترسی",
  Direction: "جهت",
  Purpose: "نوع پرداخت",
  PaidAt: "تاریخ پرداخت",
  VoidedAt: "زمان ابطال",
  RecordedAt: "زمان ثبت",
  CheckNumber: "شماره چک",
  TransferRef: "شماره پیگیری",
  TraceNumber: "شماره پیگیری",
  ApprovalCode: "کد تأیید",
  MaskedCardNumber: "شماره کارت",
  DueDate: "سررسید",
  FirstDueDate: "اولین سررسید",
  InstallmentCount: "تعداد اقساط",
  LatePenaltyPercentage: "درصد جریمه‌ی تأخیر",
  PenaltyAmount: "جریمه‌ی دیرکرد",
  PenaltyWaivedAmount: "جریمه‌ی بخشوده",
  PenaltyWaiveReason: "دلیل بخشودگی",
  EarlySettlementDiscountAmount: "تخفیف تسویه‌ی زودهنگام",
  ReturnCreditAmount: "اعتبار مرجوعی",
  ReturnNumber: "شماره مرجوعی",
  ReturnDate: "تاریخ مرجوعی",
  SerialNumber: "سریال",
  BinLocation: "محل قفسه",
  PrintCount: "تعداد چاپ",
  FileName: "نام فایل",
  ObjectKey: "فایل",
  DriverFullName: "نام راننده",
  DriverPhoneNumber: "تلفن راننده",
  VehiclePlate: "پلاک",
  Resolution: "تصمیم",
  ResolutionNote: "یادداشت تصمیم",
  Problem: "مشکل",
  Method: "روش",
  Scope: "دامنه",
  Source: "منبع",
  CreatedAt: "زمان ایجاد",
  UpdatedAt: "زمان ویرایش",
  OccurredAt: "زمان رخداد",
  Date: "تاریخ",
});

export const fieldLabelOf = (name) => AUDIT_FIELD_LABELS[name] ?? name;

// ─── مقدار ───────────────────────────────────────────────────────────────────

/** enumهایی که فرانت برچسبشان را دارد: `"<نوع>.<ستون>"` یا `"*.<ستون>"` برای همه‌ی نوع‌ها. */
const ENUM_LABELS = {
  "Sale.Status": SALE_STATUS_LABELS,
  "Purchase.Status": PURCHASE_STATUS_LABELS,
  "ProductUnit.Status": UNIT_STATUS_LABELS,
  "SaleInstallment.Status": INSTALLMENT_STATUS_LABELS,
  "SaleInstallmentPlan.Status": INSTALLMENT_PLAN_STATUS_LABELS,
  "PaymentDetail.Type": PAYMENT_TYPE_LABELS,
  // واژگانِ مشترک «عادی» را برچسب نمی‌زند؛ بی آن، تاریخچه‌ی هر پرداختِ عادی «۰» نشان می‌داد.
  "PaymentDetail.Purpose": { [PaymentPurposeEnum.NORMAL]: "عادی", ...PAYMENT_PURPOSE_LABELS },
  "*.PaymentType": PAYMENT_TYPE_LABELS,
  "*.TaxCategory": TAX_CATEGORY_LABELS,
  "Product.Unit": PRODUCT_UNIT_LABELS,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+)?(Z|[+-]\d{2}:?\d{2})?$/;
const ID_FIELD = /(Id|Key)$/;
const NUMERIC_TEXT_FIELDS = new Set(["PhoneNumber", "Phone", "NationalId", "PostalCode", "PersonelCode", "SerialNumber"]);

/**
 * یک مقدارِ ذخیره‌شده → `{ text, kind }` برای نمایش. `kind`: `empty` (null یا رشته‌ی خالی)،
 * `secret` (`"***"`)، یا `value`. عددِ enumی که برچسبش را نداریم همان عدد می‌ماند.
 */
export function formatAuditValue(entityType, field, value) {
  if (value === null || value === undefined || value === "") return { text: "خالی", kind: "empty" };
  if (value === "***") return { text: "پنهان", kind: "secret" };
  if (typeof value === "boolean") return { text: value ? "بله" : "خیر", kind: "value" };

  if (typeof value === "number") {
    const labels = ENUM_LABELS[`${entityType}.${field}`] ?? ENUM_LABELS[`*.${field}`];
    if (labels?.[value] != null) return { text: labels[value], kind: "value" };
    if (ID_FIELD.test(field)) return { text: `#${formatDigits(value)}`, kind: "value" };
    return { text: formatNumber(value), kind: "value" };
  }

  if (typeof value === "string") {
    if (ISO_DATE.test(value)) {
      if (!toDateOnly(value)) return { text: "خالی", kind: "empty" };
      return { text: gregorianToPersianDateTime(value), kind: "value" };
    }
    // رقم‌به‌رقم، نه `formatDigits`: صفرِ اولِ موبایل و کدِ ملی نباید بیفتد.
    if (NUMERIC_TEXT_FIELDS.has(field) && /^\d+$/.test(value)) {
      return { text: value.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]), kind: "value" };
    }
    return { text: value, kind: "value" };
  }

  return { text: JSON.stringify(value), kind: "value" };
}
