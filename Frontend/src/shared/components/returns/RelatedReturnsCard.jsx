import { Link } from "react-router-dom";
import { Layers, ChevronLeft } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import ReturnStatusBadge from "./ReturnStatusBadge";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
import { routeWithId } from "@/shared/constants/routes";

/**
 * بقیه‌ی مرجوعی‌های همین سند.
 *
 * وقتی روی یک خرید/فروش چند دور مرجوعی می‌خورد، کاربر باید بتواند
 * بفهمد کدام‌ها هستند، در چه وضعیتی‌اند، و مستقیم به آن‌ها برود —
 * بدون برگشتن به لیست و گشتنِ دستی.
 *
 * فقط وقتی نمایش داده می‌شود که واقعاً مرجوعی دیگری وجود داشته باشد،
 * تا صفحه‌ی حالت عادی (یک مرجوعی، یک سند) شلوغ نشود.
 */
export default function RelatedReturnsCard({
  returns = [],
  side,
  detailRoute,
  title = "مرجوعی‌های دیگر همین سند",
}) {
  if (returns.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          {title}
          <Badge variant="secondary" className="text-[10px]">
            {formatNumber(returns.length)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {returns.map((ret) => (
          <Link
            key={ret.id}
            to={routeWithId(detailRoute, ret.id)}
            className="w-full flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-right hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-card-foreground">
                  {ret.returnNumber}
                </span>
                <ReturnStatusBadge status={ret.status} side={side} size="sm" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {gregorianToPersian(ret.returnDate)} ·{" "}
                {formatNumber(ret.totalQuantity)} عدد کالا ·{" "}
                <span className="tabular-nums">
                  {formatRial(ret.totalAmount)}
                </span>
              </p>
            </div>
            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
