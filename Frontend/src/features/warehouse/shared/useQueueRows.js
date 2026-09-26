import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { EFFECT_DIRECTIONS } from "@/shared/domain/returns/effects";
import { ROUTES } from "@/shared/constants/routes";
import { fetchPurchaseReturnPendingEffects } from "@/features/warehouse/receiving/services/api-v1";
import {
  fetchSaleReturnPendingEffects,
  fetchSaleForShipping,
} from "@/features/warehouse/shipping/services/api-v1";
import { fetchPurchaseReturnById } from "@/features/purchases/returns/services/api-v1";
import { fetchSalesReturnById } from "@/features/sales/returns/services/api-v1";
import { fetchPurchaseById } from "@/features/purchases/orders/services/api-v1";
import { receivingKeys } from "@/features/warehouse/receiving/services/queryKeys";
import { shippingKeys } from "@/features/warehouse/shipping/services/queryKeys";
import { RECEIVING_AWAITING_STATUSES } from "@/features/warehouse/receiving/domain/receivingVocabulary";
import { SHIPPING_AWAITING_STATUSES } from "@/features/warehouse/shipping/domain/shippingVocabulary";
import { QUEUE_FILTER } from "./queueFilters";

const { GOODS_IN, GOODS_OUT, GOODS_RELEASE, GOODS_SCRAP } = EFFECT_DIRECTIONS;

/** ردیفِ «کالای مرجوعی» در جدولِ صف (در برابرِ ردیفِ خرید/فروش). */
export const isReturnRow = (row) => !!row?.__return;

/** کلیدِ ردیف: خرید/فروش با شناسه، مرجوعی با کلیدِ خودش (شناسه‌ها هم‌پوشانی دارند). */
export const queueRowKey = (row) =>
  isReturnRow(row.original) ? row.original.key : row.original.id;

/** ردیف‌های مرجوعی با رنگِ ملایم از بقیه جدا می‌شوند. */
export const queueRowClassName = (row) =>
  isReturnRow(row.original) ? "bg-amber-500/5 hover:bg-amber-500/10" : "";

/**
 * کالای مرجوعی‌ای که منتظرِ این صفحه‌ی انبار است — دو نوع، با دو رفتار:
 *
 *  - **جایگزین** (`replacement`): کالایی که تامین‌کننده همراهِ محموله‌ی بعدیِ
 *    همان خرید می‌فرستد (دریافت)، یا کالایی که همراهِ ارسالِ همان فروش برای
 *    مشتری می‌رود (ارسال). ردیفِ جدا ندارد؛ روی ردیفِ همان خرید/فروش علامت
 *    می‌خورد و در صفحه‌ی جزئیاتِ همان دریافت/ارسال ثبت می‌شود.
 *  - **جدا** (`separate`): کالایی که مشتری پس می‌آورد (دریافت)، و عودت به
 *    تامین‌کننده و تعیین تکلیفِ قرنطینه (ارسال). ردیفِ خودشان را دارند و به
 *    صفحه‌ی همان مرجوعی می‌روند.
 */
const QUEUES = {
  in: {
    replacement: { side: "purchase", directions: [GOODS_IN] },
    separate: {
      side: "sale",
      directions: [GOODS_IN],
      label: "برگشتی از مشتری",
      link: (row) => ROUTES.WAREHOUSE_RECEIVING_RETURN_DETAIL.replace(":id", row.returnId),
    },
    action: "ثبت دریافت",
    awaitingStatuses: RECEIVING_AWAITING_STATUSES,
  },
  out: {
    replacement: { side: "sale", directions: [GOODS_OUT] },
    separate: {
      side: "purchase",
      directions: [GOODS_OUT, GOODS_RELEASE, GOODS_SCRAP],
      label: "عودت به تامین‌کننده",
      link: (row) => ROUTES.WAREHOUSE_SHIPPING_RETURN_DETAIL.replace(":id", row.returnId),
    },
    action: "ثبت ارسال",
    awaitingStatuses: SHIPPING_AWAITING_STATUSES,
  },
};

const RETURN_ID_KEY = { purchase: "purchaseReturnId", sale: "saleReturnId" };

/** اثرهای معلق → یک گروه به ازای هر مرجوعی. */
function groupByReturn(effects, side, directions) {
  const groups = new Map();
  effects
    .filter((effect) => directions.includes(Number(effect.direction)))
    .filter((effect) => (Number(effect.remainingQuantity) || 0) > 0)
    .forEach((effect) => {
      const returnId = effect[RETURN_ID_KEY[side]];
      const key = `return-${side}-${returnId}`;
      if (!groups.has(key)) {
        groups.set(key, { key, side, returnId, returnNumber: effect.returnNumber, lines: [] });
      }
      groups.get(key).lines.push(effect);
    });
  return [...groups.values()];
}

const dateOnly = (value) => (value ? String(value).slice(0, 10) : "");

/** همان فیلترهای صف روی ردیف‌هایی که فرانت اضافه می‌کند. */
function matchesFilters(row, filters) {
  const search = String(filters.globalSearch || "").trim();
  if (
    search &&
    !String(row.returnNumber || "").includes(search) &&
    !String(row.invoiceNumber || "").includes(search)
  ) {
    return false;
  }
  if (filters.supplierId && Number(row.supplierId) !== Number(filters.supplierId)) return false;
  if (
    filters.customerName &&
    !String(row.customerName ?? row.counterpartyName ?? "").includes(filters.customerName)
  ) {
    return false;
  }
  const date = dateOnly(row.date ?? row.invoiceDate);
  if (filters.fromDate && date && date < dateOnly(filters.fromDate)) return false;
  if (filters.toDate && date && date > dateOnly(filters.toDate)) return false;
  return true;
}

/**
 * ردیف‌های جدولِ صفِ دریافت/ارسال، با کالای مرجوعیِ منتظر.
 *
 * بسته به فیلترِ وضعیت (`QUEUE_FILTER`):
 *  - «در انتظار»: ردیف‌های مرجوعیِ جدا و سندهایی که فقط به‌خاطرِ جایگزین منتظرند
 *    (فقط صفحه‌ی اول)، بعد صفحه‌ی سندها با علامتِ جایگزین.
 *  - «مرجوعی: برگشتی/عودت»: فقط ردیف‌های مرجوعیِ جدا.
 *  - «مرجوعی: جایگزین»: فقط سندهایی که جایگزینِ منتظر دارند.
 *  - یک وضعیتِ عددی: صفحه‌ی سندها با علامتِ جایگزین.
 *
 * `PendingEffectDto` شناسه‌ی سند و نامِ طرف حساب را ندارد (بند ۹ سندِ فروش
 * برای بکند)؛ تا آن وقت جزئیاتِ هر مرجوعیِ معلق یک بار خوانده می‌شود.
 *
 * @param kind `"in"` یا `"out"`.
 * @param filters فیلترهای debounce‌شده‌ی صف (شاملِ `status`).
 * @param isFirstPage صفحه‌ی اولِ جدول است؟
 * @returns `(pageItems) => rows`
 */
export function useQueueRows(kind, filters, isFirstPage) {
  const config = QUEUES[kind];
  const baseKey = kind === "in" ? receivingKeys.lists() : shippingKeys.lists();
  const mode = filters.status;
  const withExtras = mode === QUEUE_FILTER.AWAITING && isFirstPage;

  const pendingQueries = useQueries({
    queries: ["purchase", "sale"].map((side) => ({
      queryKey: [...baseKey, "return-rows", side],
      queryFn: () =>
        side === "purchase"
          ? fetchPurchaseReturnPendingEffects(undefined)
          : fetchSaleReturnPendingEffects(undefined),
      refetchOnMount: "always",
    })),
  });
  const purchaseEffects = pendingQueries[0]?.data;
  const saleEffects = pendingQueries[1]?.data;

  const { replacementGroups, separateGroups } = useMemo(() => {
    const effectsOf = (side) => (side === "purchase" ? purchaseEffects : saleEffects) ?? [];
    return {
      replacementGroups: groupByReturn(
        effectsOf(config.replacement.side),
        config.replacement.side,
        config.replacement.directions,
      ),
      separateGroups: groupByReturn(
        effectsOf(config.separate.side),
        config.separate.side,
        config.separate.directions,
      ),
    };
  }, [purchaseEffects, saleEffects, config]);

  const allGroups = [...replacementGroups, ...separateGroups];
  const details = useQueries({
    queries: allGroups.map((group) => ({
      queryKey: [...baseKey, "return-rows", group.side, "doc", String(group.returnId)],
      queryFn: () =>
        group.side === "purchase"
          ? fetchPurchaseReturnById(group.returnId)
          : fetchSalesReturnById(group.returnId),
      staleTime: 1000 * 60,
    })),
  });
  const detailOf = (group) => details[allGroups.indexOf(group)]?.data;

  // شماره‌ی مرجوعی‌هایی که جایگزینشان منتظرِ هر خرید/فروش است.
  const replacementsByDocument = new Map();
  replacementGroups.forEach((group) => {
    const doc = detailOf(group);
    const documentId = doc ? doc.purchaseId ?? doc.saleId : null;
    if (documentId == null) return;
    const numbers = replacementsByDocument.get(documentId) ?? [];
    replacementsByDocument.set(documentId, [...numbers, group.returnNumber]);
  });

  const documentIds = [...replacementsByDocument.keys()];
  const documents = useQueries({
    queries: documentIds.map((id) => ({
      queryKey: [...baseKey, "return-rows", "document", String(id)],
      queryFn: () => (kind === "in" ? fetchPurchaseById(id) : fetchSaleForShipping(id)),
      enabled: withExtras || mode === QUEUE_FILTER.REPLACEMENTS,
      staleTime: 1000 * 60,
    })),
  });

  const annotate = (rows) =>
    rows.map((row) =>
      replacementsByDocument.has(row.id)
        ? { ...row, replacementReturnNumbers: replacementsByDocument.get(row.id) }
        : row,
    );

  const replacementDocumentRows = annotate(
    documents
      .map((query) => query.data)
      .filter(Boolean)
      .filter((doc) => matchesFilters(doc, filters))
      .map((doc) => ({
        id: doc.id,
        invoiceNumber: doc.invoiceNumber,
        supplierName: doc.supplierName,
        supplierId: doc.supplierId,
        customerName: doc.customerName,
        invoiceDate: doc.invoiceDate,
        status: doc.status,
      })),
  );

  const returnRows = separateGroups
    .map((group) => {
      const doc = detailOf(group);
      const row = {
        __return: true,
        ...group,
        sideLabel: config.separate.label,
        actionLabel: config.action,
        counterpartyName: doc ? doc.supplierName ?? doc.customerName ?? "" : "",
        supplierId: doc?.supplierId ?? null,
        invoiceNumber: doc ? doc.purchaseInvoiceNumber ?? doc.saleInvoiceNumber ?? "" : "",
        date: doc?.returnDate ?? null,
      };
      return { ...row, link: config.separate.link(row) };
    })
    // فیلترِ طرف حسابِ این صفحه (تامین‌کننده در دریافت، مشتری در ارسال) روی
    // ردیفِ مرجوعیِ سمتِ دیگر معنا ندارد؛ با آن فیلتر پنهان می‌شوند.
    .filter(() => (kind === "in" ? !filters.supplierId : !filters.customerName))
    .filter((row) => matchesFilters(row, filters));

  return (pageItems = []) => {
    if (mode === QUEUE_FILTER.RETURNS) return returnRows;
    if (mode === QUEUE_FILTER.REPLACEMENTS) return replacementDocumentRows;
    const page = annotate(pageItems);
    if (!withExtras) return page;
    // سندی که در صفِ پیش‌فرض هست همان‌جا علامت می‌خورد؛ فقط بقیه اضافه می‌شوند.
    const extras = replacementDocumentRows.filter(
      (doc) => !config.awaitingStatuses.includes(Number(doc.status)),
    );
    return [...returnRows, ...extras, ...page];
  };
}
