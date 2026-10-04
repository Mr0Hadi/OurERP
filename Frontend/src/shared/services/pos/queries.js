import { useQuery } from "@tanstack/react-query";

import { fetchPosTerminals } from "./api-v1";

export const posKeys = { terminals: ["pos", "terminals"] };

/** دستگاه‌های کارتخوانِ فعال (مشترکِ همه‌ی کاربران). */
export function usePosTerminalsQuery() {
  return useQuery({
    queryKey: posKeys.terminals,
    queryFn: fetchPosTerminals,
    staleTime: 1000 * 60 * 5,
  });
}
