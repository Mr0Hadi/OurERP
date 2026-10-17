import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";

/**
 * لایه‌ی تماس با `api/Audit` (بخش ۲۱ سندِ api-guide.fa.md) — همه `GET` و فقط‌خواندنی، پشتِ
 * دسترسیِ `AuditLogView`.
 *
 * هر کامندی که چیزی ذخیره کند یک «رویداد» می‌سازد (چه کسی، کِی، کدام عملیات) و زیرِ آن، برای
 * هر سطرِ اضافه/ویرایش/حذف‌شده یک «تغییر» با مقدارهای قبل و بعد.
 */

/** `AuditEventListSortEnum`ِ بکند، بر اساسِ شناسه‌ی ستونِ جدول. */
export const AUDIT_EVENT_SORT_COLUMNS = {
  occurredAt: 0,
  actionTitle: 1,
  userName: 2,
};

/** `GET GetAuditEventList` — فهرستِ صفحه‌بندی‌شده‌ی رویدادها، بدونِ جزئیاتِ تغییرات. */
export async function fetchAuditEvents(params) {
  const { data } = await axiosInstance.get("/Audit/GetAuditEventList", { params });
  return normalizeListResponse(data, { itemsKey: "auditEventList" });
}

/** `GET GetAuditEventDetail` — یک رویداد با *همه‌ی* تغییراتش؛ ناموجود ۴۰۴. */
export async function fetchAuditEventDetail(id) {
  const { data } = await axiosInstance.get("/Audit/GetAuditEventDetail", { params: { id } });
  return data;
}

/**
 * `GET GetDocumentHistory` — تاریخچه‌ی یک سند، جدیدترین اول، بدونِ صفحه‌بندی. در هر رویداد فقط
 * تغییراتِ همین سند آمده.
 */
export async function fetchDocumentHistory(documentKind, documentId) {
  const { data } = await axiosInstance.get("/Audit/GetDocumentHistory", {
    params: { documentKind, documentId },
  });
  return data ?? [];
}

/**
 * `GET GetEntityHistory` — تاریخچه‌ی یک سطرِ بی‌سند (مشتری، کالا، کاربر، ...)، جدیدترین اول،
 * بدونِ صفحه‌بندی. `entityType` نامِ کلاسِ بکند است (`Customer`) و `entityKey` کلید به‌صورتِ متن.
 */
export async function fetchEntityHistory(entityType, entityKey) {
  const { data } = await axiosInstance.get("/Audit/GetEntityHistory", {
    params: { entityType, entityKey: String(entityKey) },
  });
  return data ?? [];
}

/** `GET GetAuditActionList` — `{ value, name, title }` برای همه‌ی عملیات‌ها (منوی فیلتر). */
export async function fetchAuditActions() {
  const { data } = await axiosInstance.get("/Audit/GetAuditActionList");
  return data ?? [];
}
