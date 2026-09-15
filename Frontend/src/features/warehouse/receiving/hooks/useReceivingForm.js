import { useEffect } from 'react';
import {
  receivingInfoVersion,
  useReceivingFormStore,
} from '../store/receivingFormStore';

// دریافت سقف ندارد (رسیدنِ بیش از سفارش واقعیت است، نه خطا)؛ این فقط
// حدِ عملیِ ورودیِ شمارنده است.
export const NO_QUANTITY_CAP = 99999;

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const toCount = (value) => {
  const num = Math.floor(Number(value));
  return Number.isNaN(num) || num < 0 ? 0 : Math.min(num, NO_QUANTITY_CAP);
};

const defectTotalOf = (row) =>
  (row.defects || []).reduce((sum, defect) => sum + (Number(defect.quantity) || 0), 0);

/** مشکل‌ها نمی‌توانند از رسیده بیشتر شوند؛ اضافه از ته هرس می‌شود. */
function trimDefects(defects, arrived) {
  let budget = arrived;
  const trimmed = [];
  for (const defect of defects) {
    if (budget <= 0) break;
    const quantity = Math.min(Number(defect.quantity) || 0, budget);
    if (quantity > 0) {
      trimmed.push({ ...defect, quantity });
      budget -= quantity;
    }
  }
  return trimmed;
}

/**
 * پیش‌نمایشِ تقسیمی که سرور انجام می‌دهد — قاعده‌ی «اول سالم» بخش ۹:
 *
 *   h = min(H, S)        سالمِ سهمِ سفارش  → موجودی
 *   d = min(D, S − h)    خرابِ سهمِ سفارش  → قرنطینه، خریده‌شده
 *   A − h − d            مازاد             → قرنطینه، بدون ارزش
 *
 * فقط نمایش است؛ عددِ نهایی را سرور می‌گذارد.
 */
export function allocationOf(item) {
  const arrived = Number(item.arrivedQuantity) || 0;
  const owed = Math.max(0, Number(item.stillOwedQuantity) || 0);
  const defective = Math.min(defectTotalOf(item), arrived);
  const healthy = arrived - defective;
  const healthyOnOrder = Math.min(healthy, owed);
  const defectiveOnOrder = Math.min(defective, owed - healthyOnOrder);
  return {
    healthyOnOrder,
    defectiveOnOrder,
    excess: arrived - healthyOnOrder - defectiveOnOrder,
  };
}

/**
 * فرمِ یک دورِ دریافتِ خرید، با شمارش.
 *
 * انباردار فقط آنچه را می‌بیند می‌گوید: از هر قلم چند عدد رسید، چندتایش
 * به چه دلیل خراب است، و چه کالایی بدون قلم رسید. تقسیم به موجودی،
 * قرنطینه و مازاد کارِ سرور است.
 */
export function useReceivingForm(receivingInfo) {
  const {
    formData,
    setFormData,
    setItems,
    setUnlistedItems,
    initializeFromReceivingInfo,
    initializedForId,
    resetForm,
  } = useReceivingFormStore();

  const version = receivingInfoVersion(receivingInfo);

  useEffect(() => {
    if (version && initializedForId !== version) {
      initializeFromReceivingInfo(receivingInfo);
    }
  }, [version, receivingInfo, initializeFromReceivingInfo, initializedForId]);

  const items = formData.items || [];
  const unlistedItems = formData.unlistedItems || [];

  // هر ردیف با `rowKey` شناخته می‌شود تا ویرایشگرِ مشکل روی هر دو فهرست
  // یک‌جور کار کند.
  const patchRow = (rowKey, patch) => {
    if (rowKey.startsWith('u-')) {
      setUnlistedItems(
        unlistedItems.map((row) => (row.rowKey === rowKey ? { ...row, ...patch(row) } : row)),
      );
    } else {
      setItems(items.map((row) => (row.rowKey === rowKey ? { ...row, ...patch(row) } : row)));
    }
  };

  const handleArrivedChange = (rowKey, value) =>
    patchRow(rowKey, (row) => {
      const arrivedQuantity = toCount(value);
      return { arrivedQuantity, defects: trimDefects(row.defects, arrivedQuantity) };
    });

  const handleAddDefect = (rowKey, problem) =>
    patchRow(rowKey, (row) => {
      const remaining = row.arrivedQuantity - defectTotalOf(row);
      if (remaining <= 0) return {};
      return {
        defects: [...row.defects, { id: generateId(), problem, quantity: 1, note: '' }],
      };
    });

  const handleUpdateDefect = (rowKey, defectId, field, value) =>
    patchRow(rowKey, (row) => ({
      defects: row.defects.map((defect) => {
        if (defect.id !== defectId) return defect;
        if (field !== 'quantity') return { ...defect, [field]: value };
        const others = row.defects
          .filter((entry) => entry.id !== defectId)
          .reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
        return {
          ...defect,
          quantity: Math.min(toCount(value), Math.max(0, row.arrivedQuantity - others)),
        };
      }),
    }));

  const handleRemoveDefect = (rowKey, defectId) =>
    patchRow(rowKey, (row) => ({
      defects: row.defects.filter((defect) => defect.id !== defectId),
    }));

  /** کالای سفارش‌نداده از فهرست کالاها یا از ساختِ سریع. */
  const handleAddUnlisted = (product) => {
    const rowKey = `u-${product.productId}`;
    if (items.some((item) => item.productId === product.productId)) {
      // سرور کالای دارای قلم را در `unlistedItems` رد می‌کند؛ مقدارِ اضافه‌اش
      // روی همان قلم ثبت می‌شود.
      return { rejected: true };
    }
    const existing = unlistedItems.find((row) => row.rowKey === rowKey);
    if (existing) {
      patchRow(rowKey, (row) => ({ arrivedQuantity: toCount(row.arrivedQuantity + 1) }));
      return { rejected: false };
    }
    setUnlistedItems([
      ...unlistedItems,
      {
        rowKey,
        productId: product.productId,
        productCode: product.productCode,
        productName: product.productName,
        unit: product.unit,
        arrivedQuantity: 1,
        defects: [],
      },
    ]);
    return { rejected: false };
  };

  const handleRemoveUnlisted = (rowKey) =>
    setUnlistedItems(unlistedItems.filter((row) => row.rowKey !== rowKey));

  const isAllComplete =
    items.length > 0 &&
    items.every((item) => item.arrivedQuantity >= item.stillOwedQuantity);

  const hasSomethingToReceive =
    items.some((item) => (Number(item.arrivedQuantity) || 0) > 0) ||
    unlistedItems.some((row) => (Number(row.arrivedQuantity) || 0) > 0);

  const defectsOf = (row) =>
    row.defects
      .filter((defect) => (Number(defect.quantity) || 0) > 0)
      .map((defect) => ({
        problem: defect.problem,
        quantity: Number(defect.quantity) || 0,
        note: defect.note || undefined,
      }));

  /**
   * بدنه‌ی `ReceivePurchaseCommand`، یا `null` وقتی از خرید چیزی نرسیده
   * (مثلاً محموله فقط کالای جایگزینِ مرجوعی است). ردیفِ صفر فرستاده
   * نمی‌شود چون سرور `ArrivedQuantity > 0` می‌خواهد.
   *
   * @param images خروجیِ `filesPayload` آپلودرِ صفحه — `ReceivePurchaseImageDto[]`.
   */
  const buildCommand = (images = []) => {
    const commandItems = items
      .filter((item) => (Number(item.arrivedQuantity) || 0) > 0)
      .map((item) => ({
        purchaseItemId: item.purchaseItemId,
        arrivedQuantity: Number(item.arrivedQuantity) || 0,
        defects: defectsOf(item),
      }));
    const commandUnlisted = unlistedItems
      .filter((row) => (Number(row.arrivedQuantity) || 0) > 0)
      .map((row) => ({
        productId: row.productId,
        arrivedQuantity: Number(row.arrivedQuantity) || 0,
        defects: defectsOf(row),
      }));
    if (commandItems.length === 0 && commandUnlisted.length === 0) return null;

    return {
      purchaseId: formData.purchaseId,
      receivedDate: formData.receivedDate || undefined,
      receivingNote: formData.receivingNote || undefined,
      driverFullName: formData.driverFullName || undefined,
      driverPhoneNumber: formData.driverPhoneNumber || undefined,
      vehiclePlate: formData.vehiclePlate || undefined,
      items: commandItems,
      unlistedItems: commandUnlisted,
      images,
    };
  };

  return {
    formData,
    setFormData,
    items,
    unlistedItems,
    handleArrivedChange,
    handleAddDefect,
    handleUpdateDefect,
    handleRemoveDefect,
    handleAddUnlisted,
    handleRemoveUnlisted,
    isAllComplete,
    hasSomethingToReceive,
    buildCommand,
    resetForm,
  };
}
