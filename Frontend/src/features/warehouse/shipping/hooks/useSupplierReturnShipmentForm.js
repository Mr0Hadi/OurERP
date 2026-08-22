import { useEffect, useRef, useState } from "react";
import { buildGoodsLines } from "@/shared/domain/returns/resolutions";
import { EFFECT_KINDS } from "@/shared/domain/returns/effects";

const EMPTY_TRANSPORT = {
  shippingNote: "",
  shippedDate: new Date().toISOString().slice(0, 10),
  driverName: "",
  driverNationalId: "",
  vehiclePlate: "",
};

/**
 * اثرهای معلقِ «عودت کالا به تامین‌کننده» در این مرجوعی.
 *
 * منبعش دیگر «تصمیمِ نوع عودت» نیست بلکه خودِ اثر GOODS_OUT است — پس
 * هر تصمیمی که به هر دلیلی کالایی از انبار بیرون می‌فرستد به‌طور
 * خودکار اینجا دیده می‌شود، بدون اینکه این فایل لازم باشد فهرستِ
 * انواع تصمیم را بشناسد.
 *
 * کالای هر ردیف از خودِ اثر خوانده می‌شود نه از ادعا، چون در تعویض با
 * کالای دیگر این دو یکی نیستند و انباردار باید کالای واقعیِ ارسالی را
 * ببیند.
 */
function buildPendingItems(purchaseReturn) {
  if (!purchaseReturn) return [];
  return buildGoodsLines(purchaseReturn, EFFECT_KINDS.GOODS_OUT)
    .filter((line) => line.remainingQty > 0)
    .map((line) => ({
      productId: line.effectId,
      effectId: line.effectId,
      productName: line.productName,
      productCode: line.productCode,
      expectedQty: line.remainingQty,
      shippedQty: line.remainingQty,
      note:
        line.doneQty > 0
          ? `${line.doneQty.toLocaleString("fa-IR")} از ${line.qty.toLocaleString("fa-IR")} قبلاً ارسال شده`
          : "",
    }));
}

export function useSupplierReturnShipmentForm(purchaseReturn) {
  const [items, setItems] = useState(() => buildPendingItems(purchaseReturn));
  const [transportInfo, setTransportInfo] = useState({ ...EMPTY_TRANSPORT });
  const initializedVersionRef = useRef(null);

  const version = purchaseReturn ? `${purchaseReturn.id}:${purchaseReturn.updatedAt}` : null;

  useEffect(() => {
    if (version && initializedVersionRef.current !== version) {
      initializedVersionRef.current = version;
      setItems(buildPendingItems(purchaseReturn));
    }
  }, [version, purchaseReturn]);

  const handleItemChange = (productId, field, value) => {
    if (field !== "shippedQty") return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const num = Number(value);
        const clamped = Number.isNaN(num) || num < 0 ? 0 : Math.min(num, item.expectedQty);
        return { ...item, shippedQty: clamped };
      }),
    );
  };

  const setTransportField = (patch) => setTransportInfo((prev) => ({ ...prev, ...patch }));

  const isAllComplete = items.length > 0 && items.every((item) => (item.shippedQty || 0) >= item.expectedQty);
  const hasAnyToShip = items.some((item) => (item.shippedQty || 0) > 0);

  const isTransporterValid =
    !!transportInfo.driverName?.trim() &&
    (!!transportInfo.driverNationalId?.trim() || !!transportInfo.vehiclePlate?.trim());

  const buildPayload = () => ({
    date: transportInfo.shippedDate,
    note: transportInfo.shippingNote,
    partyName: transportInfo.driverName,
    partyNationalId: transportInfo.driverNationalId,
    vehiclePlate: transportInfo.vehiclePlate,
    rounds: items
      .filter((item) => (item.shippedQty || 0) > 0)
      .map((item) => ({ effectId: item.effectId, qty: item.shippedQty })),
  });

  const reset = () => {
    initializedVersionRef.current = null;
    setItems([]);
    setTransportInfo({ ...EMPTY_TRANSPORT });
  };

  return {
    items,
    transportInfo,
    handleItemChange,
    setTransportField,
    isAllComplete,
    hasAnyToShip,
    isTransporterValid,
    buildPayload,
    reset,
  };
}