import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { getErrorMessage } from "@/shared/lib/errorMessage";
import { updateSystemSettings } from "./api-v1";
import { settingKeys } from "./queryKeys";

/** `[{ key, value }]` — پاسخ (همه‌ی گروه‌ها با مقدارهای تازه) مستقیم در کش می‌نشیند. */
export function useUpdateSystemSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: (groups) => {
      queryClient.setQueryData(settingKeys.system(), groups);
      toast.success("تنظیمات ذخیره شد.");
    },
    onError: (error) => toast.error(getErrorMessage(error, "ذخیره‌ی تنظیمات انجام نشد.")),
  });
}
