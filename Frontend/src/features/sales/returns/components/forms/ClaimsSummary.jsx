import { Badge } from "@/shared/components/ui/badge";
import { SALES_RETURN_REASON_LABELS } from "../../services/mockData";

/** آنچه مشتری ادعا کرده — پیش از بررسی فیزیکی انبار. */
export default function ClaimsSummary({ item }) {
  const claims = item.claims || [];
  if (claims.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {claims.map((claim) => (
        <Badge key={claim.id} variant="outline" className="text-[10px] gap-1">
          {SALES_RETURN_REASON_LABELS[claim.reason] ?? claim.reason}:{" "}
          {(Number(claim.qty) || 0).toLocaleString("fa-IR")}
        </Badge>
      ))}
    </div>
  );
}
