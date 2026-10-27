import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * نتیجه‌ی ساخت: یک پیش‌فاکتور برای هر تامین‌کننده، با پیوند به هر کدام برای بازبینی و ارسال.
 *
 * @param result `[{ supplierId, purchaseId, supplierName }]` یا `null`
 */
export default function ReorderResultDialog({ result, onOpenChange }) {
  return (
    <Dialog open={Boolean(result)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-success" />
            {formatNumber(result?.length ?? 0)} پیش‌فاکتورِ خرید ساخته شد
          </DialogTitle>
          <DialogDescription>
            پیش‌فاکتورها قابل ویرایش‌اند؛ پیش از ارسال به تامین‌کننده، مقدار و
            قیمت را بازبینی کنید.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-lg border">
          {result?.map((item) => (
            <li key={item.purchaseId}>
              <Link
                to={routeWithId(ROUTES.PURCHASES_DETAIL, item.purchaseId)}
                className="flex items-center justify-between gap-3 px-3 py-3 text-sm hover:bg-muted/50"
              >
                <span className="min-w-0 truncate font-medium">
                  {item.supplierName ?? `تامین‌کننده #${item.supplierId}`}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-primary">
                  خرید #{formatNumber(item.purchaseId)}
                  <ExternalLink className="size-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            ادامه در همین صفحه
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
