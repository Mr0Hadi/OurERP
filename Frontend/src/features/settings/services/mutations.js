import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { getErrorMessage } from "@/shared/lib/errorMessage";
import { authKeys } from "@/features/auth/services/queryKeys";
import { updateSystemSettings } from "./api-v1";
import { settingKeys } from "./queryKeys";

/**
 * `[{ key, value }]` — پاسخ (همه‌ی گروه‌ها با مقدارهای تازه) مستقیم در کش می‌نشیند. سوییچ‌های
 * قابلیت (`GetFeatureFlags`) هم از همین تنظیم‌ها خوانده می‌شوند، پس باطل می‌شوند تا منو عوض شود.
 */
export function useUpdateSystemSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: (groups) => {
      queryClient.setQueryData(settingKeys.system(), groups);
      queryClient.invalidateQueries({ queryKey: authKeys.featureFlags() });
      toast.success("تنظیمات ذخیره شد.");
    },
    onError: (error) => toast.error(getErrorMessage(error, "ذخیره‌ی تنظیمات انجام نشد.")),
  });
}
