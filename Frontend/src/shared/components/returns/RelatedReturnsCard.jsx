import { useNavigate } from "react-router-dom";
import { Layers, ChevronLeft } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { RETURN_STATUS_STYLES } from "@/shared/domain/returns/statuses";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * بقیه‌ی مرجوعی‌های همین سند.
 *
 * وقتی روی یک خرید/فروش چند دور مرجوعی می‌خورد، تا پیش از این تنها
 * نشانه‌اش یک عدد کوچک زیر «تحویل‌شده» بود («n در مرجوعی دیگر») که نه
 * می‌گفت کدام‌ها، نه در چه وضعیتی، و راهی هم برای رفتن به آن‌ها نبود؛
 * کاربر باید به لیست برمی‌گشت و دستی دنبالشان می‌گشت.
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
  const navigate = useNavigate();

  if (returns.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          {title}
          <Badge variant="secondary" className="text-[10px]">
            {fa(returns.length)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {returns.map((ret) => (
          <button
            key={ret.id}
            type="button"
            onClick={() => navigate(detailRoute.replace(":id", ret.id))}
            className="w-full flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-right hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-card-foreground">
                  {ret.returnNumber}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${RETURN_STATUS_STYLES[ret.status] ?? ""}`}
                >
                  {side.statusLabels[ret.status] ?? ret.status}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {gregorianToPersian(ret.returnDate)} ·{" "}
                {fa(ret.claimsCount)} ادعا ·{" "}
                <span className="tabular-nums">
                  {fa(ret.totalClaimedAmount)} ریال
                </span>
              </p>
            </div>
            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
