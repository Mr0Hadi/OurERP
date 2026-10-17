import { Link } from "react-router-dom";
import { Activity } from "lucide-react";

import PageHeaderActions from "@/shared/components/layout/PageHeaderActions";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";
import { withFilters } from "@/shared/hooks/useUrlPreset";
import { usePermission } from "@/features/auth/hooks/usePermission";

/**
 * «فعالیت‌ها»ی یک کارمند در هدرِ صفحه‌اش: گزارشِ فعالیت با فیلترِ همین کاربر. تاریخچه‌ی خودِ
 * رکوردِ کاربر (چه کسی او را ویرایش کرد) با `AuditHistoryButton` جداست.
 */
export default function UserActivityButton({ userId }) {
  const { allows } = usePermission();
  if (!allows("AuditLogView") || !userId) return null;

  return (
    <PageHeaderActions>
      <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
        <Link to={withFilters(ROUTES.AUDIT, { userId })} aria-label="فعالیت‌های این کاربر">
          <Activity className="size-4" />
          <span className="max-sm:hidden">فعالیت‌ها</span>
        </Link>
      </Button>
    </PageHeaderActions>
  );
}
