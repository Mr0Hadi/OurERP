import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { quickActionsFor } from "../../domain/quickActions";

/** میان‌برهای «شروعِ کار» — فقط آن‌هایی که صفحه‌ی مقصدشان برای کاربر باز است. */
export default function QuickActionsWidget({ context }) {
  const actions = quickActionsFor(context);

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle>دسترسی سریع</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                to={action.url}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <Icon className="size-4 shrink-0 text-primary" />
                <span className="truncate">{action.title}</span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
