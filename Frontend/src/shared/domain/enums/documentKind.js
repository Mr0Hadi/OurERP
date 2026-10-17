import { ROUTES, routeWithId } from "@/shared/constants/routes";

/**
 * `DocumentKindEnum`ِ بکند — سندی که یک ردیف به آن تعلق دارد: روی حرکت‌های دانه، منشأِ
 * قرنطینه و تغییراتِ تاریخچه (`changes[].documentKind`، فیلترِ `GetDocumentHistory`).
 */
export const DocumentKindEnum = Object.freeze({
  PURCHASE: 1,
  SALE: 2,
  PURCHASE_RETURN: 3,
  SALE_RETURN: 4,
});

export const DOCUMENT_KIND_LABELS = Object.freeze({
  [DocumentKindEnum.PURCHASE]: "خرید",
  [DocumentKindEnum.SALE]: "فروش",
  [DocumentKindEnum.PURCHASE_RETURN]: "مرجوعی خرید",
  [DocumentKindEnum.SALE_RETURN]: "مرجوعی فروش",
});

const DOCUMENT_ROUTES = {
  [DocumentKindEnum.PURCHASE]: ROUTES.PURCHASES_DETAIL,
  [DocumentKindEnum.SALE]: ROUTES.SALES_DETAIL,
  [DocumentKindEnum.PURCHASE_RETURN]: ROUTES.PURCHASES_RETURNS_DETAIL,
  [DocumentKindEnum.SALE_RETURN]: ROUTES.SALES_RETURNS_DETAIL,
};

/** آدرسِ صفحه‌ی سند؛ نوعِ ناشناخته یا بدونِ شناسه `null`. */
export const documentRouteOf = (kind, id) =>
  DOCUMENT_ROUTES[kind] && id ? routeWithId(DOCUMENT_ROUTES[kind], id) : null;
