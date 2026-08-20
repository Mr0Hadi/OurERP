import { Badge } from "@/shared/components/ui/badge";
import {
  RETURN_ISSUE_TYPE_LABELS,
  RETURN_ISSUE_TYPE_STYLES,
} from "../../services/mockData";

/**
 * نتیجه‌ی بررسی فیزیکی انبار: چه مقدار سالم بود، چه مقدار مشکل داشت،
 * و چه مقدار از ادعای مشتری هنوز به انبار نرسیده است.
 */
export default function InspectionSummary({ item }) {
  const issues = item.issues || [];
  const problemQty = issues.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const sellableQty = Math.max(0, (item.verifiedQty || 0) - problemQty);
  const missingQty = Math.max(0, item.claimedQty - (item.verifiedQty || 0));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sellableQty > 0 && (
        <Badge
          variant="outline"
          className="text-[10px] gap-1 bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800"
        >
          سالم: {sellableQty.toLocaleString("fa-IR")}
        </Badge>
      )}
      {issues.map((issue) => (
        <Badge
          key={issue.id}
          variant="outline"
          className={`text-[10px] gap-1 ${RETURN_ISSUE_TYPE_STYLES[issue.issueType] ?? ""}`}
        >
          {RETURN_ISSUE_TYPE_LABELS[issue.issueType] ?? issue.issueType}:{" "}
          {(Number(issue.qty) || 0).toLocaleString("fa-IR")}
        </Badge>
      ))}
      {missingQty > 0 && (
        <Badge
          variant="outline"
          className="text-[10px] gap-1 bg-destructive/5 text-destructive border-destructive/20"
        >
          هنوز نرسیده: {missingQty.toLocaleString("fa-IR")}
        </Badge>
      )}
    </div>
  );
}
