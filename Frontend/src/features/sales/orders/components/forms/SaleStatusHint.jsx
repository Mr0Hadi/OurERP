import { Link } from "react-router-dom";

import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";

/**
 * قدمِ بعدیِ تحویلِ فروشِ صادرشده، زیرِ فیلدِ وضعیت در «اطلاعات فاکتور». «تحویل کامل» دکمه‌ی جدا
 * ندارد: از همان منوی وضعیت انتخاب و با دکمه‌ی اصلیِ صفحه ثبت می‌شود (`ChangeSaleStatus`).
 *
 * @param canShip دسترسیِ `SaleShip` — پیوند به ارسالِ باقیِ کالا
 */
export default function SaleStatusHint({ sale, canShip }) {
  if (sale.status === SaleStatusEnum.SHIPPED) {
    return "همه‌ی کالای این فروش ارسال شده است. وقتی مشتری تحویل گرفت، «تحویل کامل» را انتخاب و ثبت کنید.";
  }
  if (sale.status === SaleStatusEnum.PARTIALLY_DELIVERED) {
    return (
      <>
        بخشی از کالا هنوز ارسال نشده؛ تحویل کامل بعد از ارسالِ باقیِ کالا از انبار ثبت می‌شود.
        {canShip && (
          <>
            {" "}
            <Link className="font-medium text-primary hover:underline" to={routeWithId(ROUTES.WAREHOUSE_SHIPPING_DETAIL, sale.id)}>
              ارسالِ باقیِ کالا
            </Link>
          </>
        )}
      </>
    );
  }
  return null;
}
