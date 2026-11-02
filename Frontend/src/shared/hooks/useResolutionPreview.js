import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "./useDebouncedValue";

const PREVIEW_DEBOUNCE_MS = 300;

/**
 * پیش‌نمایشِ سرورِ تصمیمِ در حالِ نوشتن (`PreviewResolution`، ۱۳.۴): اعتبارسنجی، اثرها و مبلغِ پیشنهادی همان
 * چیزی است که `AddClaimResolution` با همین بدنه انجام می‌دهد. ترکیب با تأخیرِ کوتاه فرستاده می‌شود و در فاصله‌ی
 * تغییرها پیش‌نمایشِ قبلی می‌ماند.
 *
 * @param preview  `(claim, composition) => Promise<{ isValid, errors, effects, suggestedMoneyAmount }>`
 * @returns `{ data, isChecking, error }` — `isChecking` تا پاسخِ همین ترکیب نرسیده
 */
export function useResolutionPreview(preview, claim, composition) {
  // رشته، نه شیء: ترکیب هر رندر از نو ساخته می‌شود و تأخیر هیچ‌وقت آرام نمی‌گرفت.
  const key = JSON.stringify(composition);
  const debounced = useDebouncedValue(key, PREVIEW_DEBOUNCE_MS);
  const query = useQuery({
    queryKey: ["resolutionPreview", claim?.id, debounced],
    queryFn: () => preview(claim, JSON.parse(debounced)),
    enabled: Boolean(preview && claim),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });
  return {
    data: query.data,
    isChecking: debounced !== key || query.isFetching,
    error: query.error,
  };
}
