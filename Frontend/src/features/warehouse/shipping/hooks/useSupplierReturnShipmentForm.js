import { useEffect, useRef, useState } from "react";
import {
  RESOLUTION_TYPES,
  RESOLUTION_LINE_STATUSES,
} from "@/features/purchases/returns/services/mockData";

const EMPTY_TRANSPORT = {
  shippingNote: "",
  shippedDate: new Date().toISOString().slice(0, 10),
  driverName: "",
  driverNationalId: "",
  vehiclePlate: "",
};

/**
 * قرینه‌ی useReplacementShipmentForm برای عودت مازاد به تامین‌کننده.
 *
 * هر قلم با شناسه‌ی ترکیبی issueId+resolutionId مشخص می‌شود، چون یک
 * ادعای مازاد می‌تواند بین چند تصمیم تقسیم شده باشد و فقط بخشِ
 * «عودت» آن اینجا دیده می‌شود — بخشی که نگهداری شده اصلاً از انبار
 * خارج نمی‌شود.
 */
function buildPendingItems(purchaseReturn) {
  const rows = [];
  (purchaseReturn?.items || []).forEach((item) => {
    (item.resolutions || []).forEach((resolution) => {
      if (resolution.type !== RESOLUTION_TYPES.RETURN_TO_SUPPLIER) return;
      if (resolution.status !== RESOLUTION_LINE_STATUSES.AWAITING) return;
      const alreadyShippedQty = resolution.shippedQty || 0;
      const remaining = resolution.qty - alreadyShippedQty;
      if (remaining <= 0) return;

      rows.push({
        productId: `${item.issueId}:${resolution.id}`,
        issueId: item.issueId,
        resolutionId: resolution.id,
        // نام ثبت‌شده‌ی انبار مرجع است؛ برای کالای ثبت‌نشده‌ای که بعداً
        // به کالای واقعی وصل شده، نام کالای واقعی هم کنارش می‌آید.
        productName: item.linkedProductName
          ? `${item.productName} (${item.linkedProductName})`
          : item.productName,
        productCode: item.productCode,
        expectedQty: remaining,
        shippedQty: remaining,
        note:
          alreadyShippedQty > 0
            ? `${alreadyShippedQty.toLocaleString("fa-IR")} از ${resolution.qty.toLocaleString("fa-IR")} قبلاً عودت داده شده`
            : "",
      });
    });
  });
  return rows;
}

export function useSupplierReturnShipmentForm(purchaseReturn) {
  const [items, setItems] = useState(() => buildPendingItems(purchaseReturn));
  const [transportInfo, setTransportInfo] = useState({ ...EMPTY_TRANSPORT });
  const initializedVersionRef = useRef(null);

  const version = purchaseReturn
    ? `${purchaseReturn.id}:${purchaseReturn.updatedAt}`
    : null;

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
        const clamped =
          Number.isNaN(num) || num < 0 ? 0 : Math.min(num, item.expectedQty);
        return { ...item, shippedQty: clamped };
      }),
    );
  };

  const setTransportField = (patch) =>
    setTransportInfo((prev) => ({ ...prev, ...patch }));

  const isAllComplete =
    items.length > 0 &&
    items.every((item) => (item.shippedQty || 0) >= item.expectedQty);
  const hasAnyToShip = items.some((item) => (item.shippedQty || 0) > 0);

  const isTransporterValid =
    !!transportInfo.driverName?.trim() &&
    (!!transportInfo.driverNationalId?.trim() ||
      !!transportInfo.vehiclePlate?.trim());

  const buildPayload = () => ({
    shippedDate: transportInfo.shippedDate,
    shippingNote: transportInfo.shippingNote,
    driverName: transportInfo.driverName,
    driverNationalId: transportInfo.driverNationalId,
    vehiclePlate: transportInfo.vehiclePlate,
    items: items
      .filter((item) => (item.shippedQty || 0) > 0)
      .map((item) => ({
        issueId: item.issueId,
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
