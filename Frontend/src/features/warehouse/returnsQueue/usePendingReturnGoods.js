import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/shared/services/api/axios";
import { fetchPurchaseReturnById } from "@/features/purchases/returns/services/api-v1";
import { fetchSalesReturnById } from "@/features/sales/returns/services/api-v1";
import { EFFECT_DIRECTIONS } from "@/shared/domain/returns/effects";
import { ROUTES } from "@/shared/constants/routes";
import { receivingKeys } from "../receiving/services/queryKeys";
import { shippingKeys } from "../shipping/services/queryKeys";

const { GOODS_IN, GOODS_OUT, GOODS_RELEASE, GOODS_SCRAP } = EFFECT_DIRECTIONS;

/**
 * کارهای انبار روی مرجوعی‌ها، برای دو صفِ «دریافت» و «ارسال».
 *
 * `Get{Purchase,Sale}ReturnPendingEffects` بدون شناسه‌ی سند، همه‌ی اثرهای
 * کالاییِ معلقِ مرجوعی‌های باز را می‌دهد. این اثرها برای هر مرجوعی گروه
 * می‌شوند و مقصدِ هر کار از روی نوعش تعیین می‌شود:
 *
 *   دریافت: کالای جایگزینِ تامین‌کننده (صفحه‌ی دریافتِ همان خرید، فقط بخشِ
 *           جایگزین) و کالایی که مشتری برمی‌گرداند (صفحه‌ی دریافتِ مرجوعی).
 *   ارسال:  کالایی که به تامین‌کننده پس می‌رود یا از قرنطینه خارج می‌شود
 *           (صفحه‌ی مرجوعیِ تامین‌کننده) و کالای جایگزین برای مشتری (صفحه‌ی
 *           ارسالِ همان فروش، فقط بخشِ جایگزین).
 *
 * شناسه‌ی خرید/فروش و نام طرف حساب در پاسخِ اثرها نیست؛ از جزئیاتِ هر
 * مرجوعی خوانده می‌شود (معمولاً چند مرجوعیِ باز بیشتر نیست).
 */
async function fetchPending(url) {
  const { data } = await axiosInstance.get(url);
  return data?.pendingEffects ?? [];
}

function groupByReturn(effects, idField) {
  const groups = new Map();
  effects
    .filter((effect) => (Number(effect.remainingQuantity) || 0) > 0)
    .forEach((effect) => {
      const id = effect[idField];
      if (!groups.has(id)) {
        groups.set(id, {
          returnId: id,
          returnNumber: effect.returnNumber,
          lines: [],
        });
      }
      groups.get(id).lines.push(effect);
    });
  return [...groups.values()];
}

async function withDetails(groups, fetchDetail) {
  return Promise.all(
    groups.map(async (group) => {
      try {
        return { ...group, doc: await fetchDetail(group.returnId) };
      } catch {
        return { ...group, doc: null };
      }
    }),
  );
}

async function fetchReceivingWork() {
  const [purchaseEffects, saleEffects] = await Promise.all([
    fetchPending("/PurchaseReturn/GetPurchaseReturnPendingEffects"),
    fetchPending("/SaleReturn/GetSaleReturnPendingEffects"),
  ]);
  const replacements = await withDetails(
    groupByReturn(
      purchaseEffects.filter((effect) => effect.direction === GOODS_IN),
      "purchaseReturnId",
    ),
    fetchPurchaseReturnById,
  );
  const customerGoods = await withDetails(
    groupByReturn(
      saleEffects.filter((effect) => effect.direction === GOODS_IN),
      "saleReturnId",
    ),
    fetchSalesReturnById,
  );
  return [
    ...replacements.map((group) => ({
      ...group,
      key: `pr-${group.returnId}`,
      kind: "کالای جایگزین از تامین‌کننده",
      partyName: group.doc?.supplierName,
      to: group.doc
        ? `${ROUTES.WAREHOUSE_RECEIVING_DETAIL.replace(":id", group.doc.purchaseId)}?returnId=${group.returnId}`
        : null,
    })),
    ...customerGoods.map((group) => ({
      ...group,
      key: `sr-${group.returnId}`,
      kind: "کالای مرجوعی مشتری",
      partyName: group.doc?.customerName,
      to: ROUTES.WAREHOUSE_RECEIVING_RETURN_DETAIL.replace(
        ":id",
        group.returnId,
      ),
    })),
  ];
}

async function fetchShippingWork() {
  const [purchaseEffects, saleEffects] = await Promise.all([
    fetchPending("/PurchaseReturn/GetPurchaseReturnPendingEffects"),
    fetchPending("/SaleReturn/GetSaleReturnPendingEffects"),
  ]);
  const toSupplier = await withDetails(
    groupByReturn(
      purchaseEffects.filter((effect) =>
        [GOODS_OUT, GOODS_RELEASE, GOODS_SCRAP].includes(effect.direction),
      ),
      "purchaseReturnId",
    ),
    fetchPurchaseReturnById,
  );
  const replacements = await withDetails(
    groupByReturn(
      saleEffects.filter((effect) => effect.direction === GOODS_OUT),
      "saleReturnId",
    ),
    fetchSalesReturnById,
  );
  return [
    ...toSupplier.map((group) => ({
      ...group,
      key: `pr-${group.returnId}`,
      kind: "مرجوعی به تامین‌کننده / تعیین تکلیف قرنطینه",
      partyName: group.doc?.supplierName,
      to: ROUTES.WAREHOUSE_SHIPPING_RETURN_DETAIL.replace(
        ":id",
        group.returnId,
      ),
    })),
    ...replacements.map((group) => ({
      ...group,
      key: `sr-${group.returnId}`,
      kind: "کالای جایگزین برای مشتری",
      partyName: group.doc?.customerName,
      to: group.doc
        ? `${ROUTES.WAREHOUSE_SHIPPING_DETAIL.replace(":id", group.doc.saleId)}?returnId=${group.returnId}`
        : null,
    })),
  ];
}

/**
 * کلیدها زیرِ `lists()`ِ همان صف‌اند تا هر نوشتنی که صف را باطل می‌کند
 * (دریافت، ارسال، تصمیمِ مرجوعی) این فهرست را هم تازه کند.
 */
export function usePendingReturnGoods(side) {
  const isReceiving = side === "receiving";
  return useQuery({
    queryKey: [
      ...(isReceiving ? receivingKeys.lists() : shippingKeys.lists()),
      "pending-returns",
    ],
    queryFn: isReceiving ? fetchReceivingWork : fetchShippingWork,
    refetchOnMount: "always",
  });
}
