import { departmentKeys } from "../departments/services/queryKeys";
import { teamKeys } from "../teams/services/queryKeys";
import { userKeys } from "@/features/employees/services/queryKeys";
import { authKeys } from "@/features/auth/services/queryKeys";

/**
 * هر تغییرِ واحد یا تیم کارمندان را جابه‌جا می‌کند: تعیینِ مسئول/جانشین
 * کارمند را به واحد/تیمِ تازه می‌برد و نقشِ قبلی‌اش را آزاد می‌کند، و حذف
 * اعضا را بی‌واحد/بی‌تیم می‌گذارد. پس فهرستِ واحدها، تیم‌ها، کارمندان و
 * نشستِ کاربرِ جاری همه باید تازه شوند.
 */
export function invalidateOrgChart(queryClient) {
  queryClient.invalidateQueries({ queryKey: departmentKeys.all });
  queryClient.invalidateQueries({ queryKey: teamKeys.all });
  queryClient.invalidateQueries({ queryKey: userKeys.all });
  queryClient.invalidateQueries({ queryKey: authKeys.session() });
}
