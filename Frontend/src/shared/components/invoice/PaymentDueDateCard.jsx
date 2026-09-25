import { useState } from "react";
import { CalendarClock } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";

/**
 * مهلت پرداخت (`Update{Purchase,Sale}PaymentDate`) — در هر وضعیتی، حتی
 * بعد از صدور. خالی یعنی بدون مهلت؛ قبل از تاریخ فاکتور را سرور رد می‌کند.
 */
export default function PaymentDueDateCard({
  value,
  canEdit,
  isPending,
  onSave,
}) {
  const [draft, setDraft] = useState(value || "");
  const [base, setBase] = useState(value || "");
  if ((value || "") !== base) {
    setBase(value || "");
    setDraft(value || "");
  }

  const dirty = draft !== base;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          مهلت پرداخت
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <PersianDatePicker
          id="payment-due-date"
          value={draft}
          onChange={(isoDate) => setDraft(isoDate || "")}
          placeholder="بدون مهلت"
          disabled={!canEdit || isPending}
        />
        {canEdit && dirty && (
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={isPending}
            onClick={() => onSave(draft || null)}
          >
            {isPending ? "در حال ذخیره..." : "ذخیره‌ی مهلت پرداخت"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
