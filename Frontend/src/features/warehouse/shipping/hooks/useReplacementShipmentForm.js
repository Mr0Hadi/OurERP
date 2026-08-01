// src/features/warehouse/shipping/hooks/useReplacementShipmentForm.js
import { useEffect, useRef, useState } from "react";
import { RESOLUTION_TYPES, RESOLUTION_LINE_STATUSES } from "@/features/sales/services/returns/mockData";

const EMPTY_TRANSPORT = {
  shippingNote: "",
  shippedDate: new Date().toISOString().slice(0, 10),
  driverName: "",
  driverNationalId: "",
  vehiclePlate: "",
};

/**
 * تمام قلم‌هایی از این مرجوعی که تصمیم «ارسال کالای جایگزین» دارند و
 * هنوز به‌طور کامل ارسال نشده‌اند را جمع می‌کند — نه فقط یک قلم. هر
 * قلم با شناسه‌ی ترکیبی lineId+resolutionId مشخص می‌شود چون تئوریاً
 * یک قلم می‌تواند بیش از یک تصمیمِ «ارسال جایگزین» داشته باشد.
 */
function buildPendingItems(salesReturn) {
  const rows = [];
  (salesReturn?.items || []).forEach((item) => {
    (item.resolutions || []).forEach((resolution) => {
      if (resolution.type !== RESOLUTION_TYPES.REPLACEMENT) return;
      if (resolution.status !== RESOLUTION_LINE_STATUSES.AWAITING) return;
      const alreadyShippedQty = resolution.shippedQty || 0;
      const remaining = resolution.qty - alreadyShippedQty;
      if (remaining <= 0) return;

      rows.push({
        productId: `${item.lineId}:${resolution.id}`,
        lineId: item.lineId,
        resolutionId: resolution.id,
        productName: item.productName,
        productCode: item.productCode,
        expectedQty: remaining,
        shippedQty: remaining,
        note:
          alreadyShippedQty > 0
            ? `${alreadyShippedQty.toLocaleString("fa-IR")} از ${resolution.qty.toLocaleString("fa-IR")} قبلاً ارسال شده`
            : "",
      });
    });
  });
  return rows;
}

export function useReplacementShipmentForm(salesReturn) {
  const [items, setItems] = useState(() => buildPendingItems(salesReturn));
  const [transportInfo, setTransportInfo] = useState({ ...EMPTY_TRANSPORT });
  const initializedVersionRef = useRef(null);

  const version = salesReturn ? `${salesReturn.id}:${salesReturn.updatedAt}` : null;

  useEffect(() => {
    if (version && initializedVersionRef.current !== version) {
      initializedVersionRef.current = version;
      setItems(buildPendingItems(salesReturn));
    }
  }, [version, salesReturn]);

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
    shippedDate: transportInfo.shippedDate,
    shippingNote: transportInfo.shippingNote,
    driverName: transportInfo.driverName,
    driverNationalId: transportInfo.driverNationalId,
    vehiclePlate: transportInfo.vehiclePlate,
    items: items
      .filter((item) => (item.shippedQty || 0) > 0)
      .map((item) => ({
        lineId: item.lineId,
        resolutionId: item.resolutionId,
        shippedQtyThisRound: item.shippedQty,
      })),
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