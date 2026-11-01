import EntitySelect from "@/shared/components/filters/EntitySelect";
import { useUserOptionsQuery } from "../services/queries";

const NO_USERS = [];

const labelOf = (user) => `${user.fullName || "بدون نام"}${user.isActive ? "" : " · غیرفعال"}`;

/**
 * انتخابِ کارمندِ ثبت‌کننده (فروشنده، کارمندِ خرید، ثبت‌کننده‌ی پرداخت). کارمندانِ غیرفعال هم هستند: سندهای
 * قدیمی‌شان هنوز در دفترند. فهرستِ سبکِ `GetUserOptions` برای هر کاربرِ واردشده باز است (۲۱.۴).
 */
export default function UserFilterSelect({ label, value, onSelect }) {
  const { data, isLoading } = useUserOptionsQuery({ includeInactive: true });

  return (
    <EntitySelect
      label={label}
      placeholder="همه"
      emptyText="کارمندی یافت نشد"
      items={data ?? NO_USERS}
      value={value}
      onSelect={onSelect}
      isLoading={isLoading}
      getLabel={labelOf}
    />
  );
}
