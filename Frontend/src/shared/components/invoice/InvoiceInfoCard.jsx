import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

/**
 * مشخصاتِ فاکتورِ صادرشده، فقط‌خواندنی — هر ردیف یک کاشی؛ عرضِ کم دو ستون،
 * عرضِ کافی چهار ستون (container query روی همین کارت).
 *
 * @param rows `{ label, value, wide?, emphasis? }[]`؛ ردیفِ بی‌مقدار نشان داده
 *   نمی‌شود. `wide` کاشی را دو ستونه می‌کند (مثلاً نامِ طرفِ حساب) و `emphasis`
 *   مقدار را درشت‌تر (مثلاً جمعِ فاکتور).
 */
export default function InvoiceInfoCard({ title = "اطلاعات فاکتور", rows = [], description }) {
  return (
    <Card className="@container/info">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-2 @xl/info:grid-cols-4">
          {rows
            .filter((row) => row.value)
            .map((row) => (
              <div
                key={row.label}
                className={`min-w-0 rounded-lg border border-border bg-muted/30 px-3 py-2 ${
                  row.wide ? "col-span-2" : ""
                }`}
              >
                <dt className="text-[11px] text-muted-foreground">{row.label}</dt>
                <dd
                  className={`mt-0.5 break-words text-card-foreground ${
                    row.emphasis ? "text-base font-bold tabular-nums" : "text-sm font-medium"
                  }`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
        </dl>
        {description && (
          <p className="whitespace-pre-line rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
