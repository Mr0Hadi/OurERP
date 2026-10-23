import { useQuery } from "@tanstack/react-query";

import { getInvoiceDocument } from "./api-v1";
import { invoiceKeys } from "./queryKeys";

/**
 * داده‌ی سندِ چاپیِ یک فاکتور/پیش‌فاکتور یا برگه‌ی مرجوعی. فقط وقتی پوسته‌ی چاپ باز است گرفته می‌شود
 * (`enabled`) و هر بار که باز شود تازه است (`staleTime: 0`ِ سراسری): سند ممکن است همین حالا پرداخت یا ویرایش
 * شده باشد. خطای ۴۰۴ تکرار نمی‌شود — سند یا endpoint نیست و تلاشِ دوباره چیزی را عوض نمی‌کند.
 */
export function useInvoiceDocumentQuery(documentKind, documentId, { enabled = true } = {}) {
  return useQuery({
    queryKey: invoiceKeys.document(documentKind, documentId),
    queryFn: () => getInvoiceDocument(documentKind, documentId),
    enabled: enabled && Boolean(documentKind && documentId),
    retry: (failureCount, error) => error?.response?.status !== 404 && failureCount < 2,
  });
}
