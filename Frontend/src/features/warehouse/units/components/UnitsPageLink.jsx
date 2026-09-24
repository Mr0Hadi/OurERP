import { Link } from "react-router-dom";
import { Barcode } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";
import { usePermission } from "@/features/auth/hooks/usePermission";

/**
 * پیوند از یک سند یا کالا به «دانه‌ها و برچسب‌ها»، با فیلترِ همان‌جا
 * (مثلاً `{ purchaseId, view: "unlabeled" }` برای برچسب‌های یک خرید).
 * بدونِ دسترسیِ دیدنِ دانه‌ها نمایش داده نمی‌شود.
 */
export default function UnitsPageLink({ params, label = "دانه‌ها و برچسب‌ها", className = "" }) {
  const { can } = usePermission();
  if (!can("ProductUnitView")) return null;

  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value != null && value !== ""),
  ).toString();

  return (
    <Button asChild type="button" variant="outline" size="sm" className={`gap-1 ${className}`}>
      <Link to={`${ROUTES.WAREHOUSE_UNITS}?${query}`}>
        <Barcode className="h-3.5 w-3.5" />
        {label}
      </Link>
    </Button>
  );
}
