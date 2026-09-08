import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getImageUrl } from "./api-v1";
import { fileKeys } from "./queryKeys";

/**
 * آدرسِ نمایشیِ یک `objectKey`.
 *
 * آدرس دیگر امضای موقت نیست: سرور بایت‌ها را خودش سرو می‌کند و
 * `api/File/GetImage?objectKey=...` تا وقتی خودِ فایل هست کار می‌کند.
 * پس نتیجه هرگز کهنه نمی‌شود و هیچ تمدیدی لازم ندارد — `staleTime`
 * بی‌نهایت یعنی برای هر کلید حداکثر یک درخواست در کلِ نشست.
 *
 * `initialUrl` همان `imageUrl`ی است که در پاسخِ لیست/جزئیات آمده؛ وقتی
 * باشد، اصلاً درخواستی زده نمی‌شود. این هوک فقط برای پاسخ‌هایی است که
 * کلید می‌دهند و آدرس نه.
 */
export function useImageUrlQuery(objectKey, { enabled = true, initialUrl } = {}) {
  return useQuery({
    queryKey: fileKeys.url(objectKey),
    queryFn: ({ signal }) => getImageUrl(objectKey, { signal }),
    enabled: Boolean(objectKey) && enabled,
    staleTime: Infinity,
    initialData: initialUrl || undefined,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** ریختنِ آدرسِ آپلودشده در کش — تا هیچ‌کس برای همان کلید دوباره درخواست نزند. */
export function useSeedImageUrl() {
  const queryClient = useQueryClient();

  return (objectKey, url) => {
    if (!objectKey || !url) return;
    queryClient.setQueryData(fileKeys.url(objectKey), url);
  };
}
