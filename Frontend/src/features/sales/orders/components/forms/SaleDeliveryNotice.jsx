import { useState } from "react";
import { Link } from "react-router-dom";
import { PackageCheck, Truck } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import Notice from "@/shared/components/feedback/Notice";
import { useMarkSaleDeliveredMutation } from "@/features/sales/orders/services/mutations";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { ROUTES, routeWithId } from "@/shared/constants/routes";

/**
 * قدمِ بعدیِ تحویلِ فروشِ صادرشده، بالای صفحه.
 *
 * «تحویل کامل» تنها وضعیتی است که دستی و فقط از «ارسال شده» گذاشته می‌شود
 * (`ChangeSaleStatus`)؛ پیش از این فقط گزینه‌ای در منوی وضعیتِ کارتِ مشخصات بود
 * که دیده نمی‌شد. «ارسال ناقص» را فقط ارسالِ باقیِ کالا از انبار جلو می‌برد.
 *
 * @param canDeliver  دسترسیِ `SaleUpdate`
 * @param canShip     دسترسیِ `SaleShip` — پیوند به صفحه‌ی ارسالِ انبار
 */
export default function SaleDeliveryNotice({ sale, canDeliver, canShip }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useMarkSaleDeliveredMutation(sale.id);

  if (sale.status === SaleStatusEnum.SHIPPED && canDeliver) {
    return (
      <>
        <Notice tone="info" icon={PackageCheck}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>همه‌ی کالای این فروش ارسال شده است. وقتی مشتری تحویل گرفت، تحویل کامل را ثبت کنید.</p>
            <Button
              type="button"
              size="sm"
              className="h-auto min-h-10 shrink-0 gap-1.5 whitespace-normal py-2 sm:min-h-8 sm:py-1.5"
              disabled={mutation.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              <PackageCheck className="size-4" />
              ثبت تحویل کامل
            </Button>
          </div>
        </Notice>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="ثبت تحویل کامل"
          description="وضعیتِ فروش «تحویل کامل» می‌شود. مرجوعی همچنان روی این فروش ممکن است."
          confirmLabel="ثبت شود"
          pendingLabel="در حال ثبت..."
          isPending={mutation.isPending}
          onConfirm={() => mutation.mutate(undefined, { onSuccess: () => setConfirmOpen(false) })}
        />
      </>
    );
  }

  if (sale.status === SaleStatusEnum.PARTIALLY_DELIVERED) {
    return (
      <Notice tone="caution" icon={Truck}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>بخشی از کالا هنوز ارسال نشده. تحویل کامل بعد از ارسالِ باقیِ کالا از انبار ثبت می‌شود.</p>
          {canShip && (
            <Button
              asChild
              type="button"
              size="sm"
              variant="outline"
              className="h-auto min-h-10 shrink-0 whitespace-normal py-2 sm:min-h-8 sm:py-1.5"
            >
              <Link to={routeWithId(ROUTES.WAREHOUSE_SHIPPING_DETAIL, sale.id)}>ارسالِ باقیِ کالا</Link>
            </Button>
          )}
        </div>
      </Notice>
    );
  }

  return null;
}
