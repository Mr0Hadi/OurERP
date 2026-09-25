import { Link } from "react-router-dom";
import { Undo2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { usePendingReturnGoods } from "./usePendingReturnGoods";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * مرجوعی‌هایی که منتظرِ کارِ انبارند، کنارِ صفِ خرید/فروش. بدونِ این،
 * کالای جایگزین و مرجوعیِ مشتری فقط از صفحه‌ی خودِ مرجوعی پیدا می‌شد.
 *
 * @param side `"receiving"` یا `"shipping"`.
 */
export default function PendingReturnGoodsCard({ side }) {
  const { data: groups = [], isLoading } = usePendingReturnGoods(side);

  if (isLoading || groups.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Undo2 className="h-4 w-4 text-muted-foreground" />
          {side === "receiving"
            ? "مرجوعی‌های در انتظار دریافت"
            : "مرجوعی‌های در انتظار ارسال"}
          <Badge variant="outline">{fa(groups.length)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {groups.map((group) => (
            <li
              key={group.key}
              className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium flex flex-wrap items-center gap-1.5">
                  {group.returnNumber}
                  {group.partyName && (
                    <span className="text-muted-foreground font-normal">
                      · {group.partyName}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{group.kind}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {group.lines
                    .map(
                      (line) =>
                        `${line.productName} × ${fa(line.remainingQuantity)}`,
                    )
                    .join("، ")}
                </p>
              </div>
              {group.to && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                >
                  <Link to={group.to}>
                    {side === "receiving" ? "ثبت دریافت" : "ثبت ارسال"}
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
