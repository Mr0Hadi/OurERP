import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

/**
 * مشخصاتِ فاکتورِ صادرشده، فقط‌خواندنی.
 *
 * @param rows `{ label, value }[]`؛ ردیفِ بی‌مقدار نشان داده نمی‌شود.
 */
export default function InvoiceInfoCard({
  title = "اطلاعات فاکتور",
  rows = [],
  description,
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {rows
            .filter((row) => row.value)
            .map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-2 sm:block"
              >
                <dt className="text-muted-foreground text-xs">{row.label}</dt>
                <dd className="font-medium text-card-foreground">
                  {row.value}
                </dd>
              </div>
            ))}
        </dl>
        {description && (
          <p className="text-sm text-muted-foreground whitespace-pre-line rounded-lg border border-border bg-muted/40 p-3">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
