import { Link } from "react-router-dom";
import { Link2, RotateCcw } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { routeWithId } from "@/shared/constants/routes";

/**
 * زنجیره‌ی مرجوعی‌ها — بک‌اند با `PreviousReturnId` نگهش می‌دارد: وقتی مشکلِ
 * یک مرجوعیِ بسته‌شده دوباره پیش می‌آید (مثلاً جایگزین هم خراب رسید)، مرجوعیِ
 * بعدی به قبلی وصل می‌شود تا تاریخچه‌ی همان مشکل یک‌جا دیده شود.
 */

/** «ادامه‌ی RET-…» با پیوند به مرجوعیِ قبلی. */
export function PreviousReturnBadge({ id, number, detailRoute }) {
  if (!id) return null;
  return (
    <Badge asChild variant="outline" className="text-xs gap-1">
      <Link to={routeWithId(detailRoute, id)}>
        <Link2 className="h-3 w-3" />
        ادامه‌ی مرجوعی {number || `#${id}`}
      </Link>
    </Badge>
  );
}

/** روی مرجوعیِ تسویه‌شده: شروعِ مرجوعیِ بعدی، وصل به همین یکی. */
export function FollowUpReturnAction({ to, hint }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-dashed border-border p-3">
      <p className="flex-1 text-xs text-muted-foreground">{hint}</p>
      <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
        <Link to={to}>
          <RotateCcw className="h-3.5 w-3.5" />
          ثبت مرجوعیِ بعدی
        </Link>
      </Button>
    </div>
  );
}
