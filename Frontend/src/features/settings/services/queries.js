import { useQuery } from "@tanstack/react-query";

import { fetchSystemSettings } from "./api-v1";
import { settingKeys } from "./queryKeys";

export function useSystemSettingsQuery() {
  return useQuery({ queryKey: settingKeys.system(), queryFn: fetchSystemSettings });
}
