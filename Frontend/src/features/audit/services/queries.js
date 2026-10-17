import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { listQuery } from "@/shared/services/api/contract";

import {
  AUDIT_EVENT_SORT_COLUMNS,
  fetchAuditActions,
  fetchAuditEventDetail,
  fetchAuditEvents,
  fetchDocumentHistory,
  fetchEntityHistory,
} from "./api-v1";
import { auditKeys } from "./queryKeys";
import { useAuditEventFilterStore } from "../store/auditEventFilterStore";

/** فیلترهای فعلیِ گزارشِ فعالیت؛ شناسه‌های تایپی با تأخیر. */
export function useAuditEventListFilters() {
  return useDebouncedFilters(useAuditEventFilterStore, {
    text: ["entityKey", "documentId"],
    instant: ["fromDate", "toDate", "userId", "action", "entityType", "documentKind"],
  });
}

/**
 * سرور `documentKind`/`documentId` را فقط با هم اعمال می‌کند و `entityKey` را بدونِ
 * `entityType` نادیده می‌گیرد؛ نیمه‌ی تنها فرستاده نمی‌شود تا کلیدِ کش هم بی‌دلیل عوض نشود.
 */
function effectiveFilters({ documentKind, documentId, entityType, entityKey, ...rest }) {
  return {
    ...rest,
    entityType,
    entityKey: entityType ? entityKey : "",
    documentKind: documentKind && documentId ? documentKind : "",
    documentId: documentKind && documentId ? documentId : "",
  };
}

export function useAuditEventsQuery(filters, pagination, sorting) {
  const params = listQuery({
    filters: effectiveFilters(filters),
    pagination,
    sorting,
    sortColumns: AUDIT_EVENT_SORT_COLUMNS,
  });
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => fetchAuditEvents(params),
    placeholderData: keepPreviousData,
  });
}

export function useAuditEventQuery(id) {
  return useQuery({
    queryKey: auditKeys.detail(id),
    queryFn: () => fetchAuditEventDetail(id),
    enabled: !!id,
    // رویداد هرگز عوض نمی‌شود (جدول‌ها فقط‌افزودنی‌اند).
    staleTime: Infinity,
  });
}

/**
 * تاریخچه‌ی یک سند (`documentKind` + `documentId`) یا یک سطرِ بی‌سند (`entityType` + `entityKey`).
 * `enabled: false` تا وقتی شیتِ تاریخچه باز نشده.
 */
export function useAuditHistoryQuery({ documentKind, documentId, entityType, entityKey }, { enabled = true } = {}) {
  const isDocument = Boolean(documentKind && documentId);
  return useQuery({
    queryKey: isDocument
      ? auditKeys.documentHistory(documentKind, documentId)
      : auditKeys.entityHistory(entityType, entityKey),
    queryFn: () =>
      isDocument ? fetchDocumentHistory(documentKind, documentId) : fetchEntityHistory(entityType, entityKey),
    enabled: enabled && (isDocument || Boolean(entityType && entityKey != null && entityKey !== "")),
  });
}

const NO_ACTIONS = [];

/** کاتالوگِ عملیات‌ها برای فیلتر؛ از خودِ enumِ سرور می‌آید و در یک نشست عوض نمی‌شود. */
export function useAuditActionsQuery() {
  const { data, isLoading } = useQuery({
    queryKey: auditKeys.actions(),
    queryFn: fetchAuditActions,
    staleTime: Infinity,
  });
  return { actions: data ?? NO_ACTIONS, isLoading };
}
