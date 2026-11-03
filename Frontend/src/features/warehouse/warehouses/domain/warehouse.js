/**
 * فرمِ انبار و فرمِ حواله — قواعدِ خالص، همان اعتبارسنجی‌های `WarehouseInputValidator` و
 * `CreateStockTransferCommandValidator` تا ۴۰۰ پیش از ارسال دیده شود.
 */

export const emptyWarehouseDraft = () => ({ code: "", name: "", address: "", description: "", isDefault: false });

export const warehouseDraftOf = (warehouse) => ({
  code: warehouse.code ?? "",
  name: warehouse.name ?? "",
  address: warehouse.address ?? "",
  description: warehouse.description ?? "",
  isDefault: Boolean(warehouse.isDefault),
});

const tooLong = (value, max) => value.trim().length > max;

export function warehouseDraftErrors(draft) {
  const errors = {};
  if (!draft.code.trim()) errors.code = "کدِ انبار را بنویسید";
  else if (tooLong(draft.code, 30)) errors.code = "کدِ انبار حداکثر ۳۰ نویسه است";
  if (!draft.name.trim()) errors.name = "نامِ انبار را بنویسید";
  else if (tooLong(draft.name, 100)) errors.name = "نامِ انبار حداکثر ۱۰۰ نویسه است";
  if (tooLong(draft.address, 500)) errors.address = "نشانی حداکثر ۵۰۰ نویسه است";
  if (tooLong(draft.description, 500)) errors.description = "توضیح حداکثر ۵۰۰ نویسه است";
  return errors;
}

const blank = (value) => value.trim() || null;

/** بدنه‌ی `CreateWarehouse`/`UpdateWarehouse`؛ کد را سرور بزرگ می‌کند، این‌جا هم تا پیش‌نمایش یکی باشد. */
export const toApiWarehouse = (draft, id) => ({
  ...(id != null && { id }),
  code: draft.code.trim().toUpperCase(),
  name: draft.name.trim(),
  address: blank(draft.address),
  description: blank(draft.description),
  isDefault: draft.isDefault,
});

/** آیا انبار هنوز دانه دارد؟ سرور غیرفعال‌کردنِ چنین انباری را رد می‌کند (ورودیِ در راه را فهرست نمی‌دهد). */
export const warehouseHoldsUnits = (warehouse) =>
  warehouse.inStockUnits + warehouse.quarantinedUnits + warehouse.reservedUnits + warehouse.outgoingInTransitUnits > 0;

/** چرا این انبار غیرفعال‌شدنی نیست؛ `null` یعنی تصمیم با سرور است. */
export function deactivateBlocker(warehouse) {
  if (warehouse.isDefault) return "انبارِ پیش‌فرض غیرفعال نمی‌شود؛ اول انبارِ دیگری را پیش‌فرض کنید.";
  if (warehouseHoldsUnits(warehouse)) return "این انبار هنوز دانه دارد؛ اول آن‌ها را منتقل کنید.";
  return null;
}

export const emptyTransferDraft = () => ({ fromWarehouseId: null, toWarehouseId: null, description: "", lines: [] });

/** ردیفِ حواله: `{ productId, name, code, quantity, barcodes[] }`؛ بارکد اختیاری، ولی اگر هست دقیقاً به تعداد. */
export function transferDraftErrors(draft) {
  const errors = {};
  if (!draft.fromWarehouseId) errors.fromWarehouseId = "انبارِ مبدأ را انتخاب کنید";
  if (!draft.toWarehouseId) errors.toWarehouseId = "انبارِ مقصد را انتخاب کنید";
  else if (draft.toWarehouseId === draft.fromWarehouseId) errors.toWarehouseId = "مبدأ و مقصد نمی‌توانند یکی باشند";
  if (draft.lines.length === 0) errors.lines = "دست‌کم یک کالا اضافه کنید";
  const bad = draft.lines.find((line) => !(line.quantity > 0));
  if (bad) errors.lines = `تعدادِ «${bad.name}» باید از صفر بیشتر باشد`;
  const mismatch = draft.lines.find((line) => line.barcodes.length > 0 && line.barcodes.length !== line.quantity);
  if (mismatch) errors.lines = `برای «${mismatch.name}» ${mismatch.quantity} بارکد لازم است، ${mismatch.barcodes.length} اسکن شده`;
  if (tooLong(draft.description, 500)) errors.description = "توضیح حداکثر ۵۰۰ نویسه است";
  return errors;
}

export const toApiTransfer = (draft) => ({
  fromWarehouseId: draft.fromWarehouseId,
  toWarehouseId: draft.toWarehouseId,
  description: blank(draft.description),
  lines: draft.lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    productUnitBarcodes: line.barcodes.length > 0 ? line.barcodes : null,
  })),
});

/**
 * `warehouseId` را روی همه‌ی بخش‌های یک محموله (`ReceiveShipment`/`DispatchShipment`) می‌گذارد: سند و هر دورِ مرجوعی.
 * یک محموله از یک انبار می‌گذرد. `null` یعنی همان پیش‌فرضِ سرور (ورود به انبارِ پیش‌فرض، خروج از هر انباری).
 */
export function withWarehouse(shipment, warehouseId) {
  if (warehouseId == null) return shipment;
  const stamp = (part) => (part ? { ...part, warehouseId } : part);
  return Object.fromEntries(
    Object.entries(shipment).map(([key, part]) => [key, Array.isArray(part) ? part.map(stamp) : stamp(part)]),
  );
}
