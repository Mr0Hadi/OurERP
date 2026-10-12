import EntitySelect from "@/shared/components/filters/EntitySelect";
import { useAllUsersQuery } from "@/features/employees/services/queries";
import { MAX_PAGE_SIZE } from "@/shared/services/api/contract";

const ALL_ROWS = { take: MAX_PAGE_SIZE };
const NO_USERS = [];

const nameOf = (user) => `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || "بدون نام";

/**
 * انتخابِ کارمندِ ثبت‌کننده (فروشنده، کارمندِ خرید، ثبت‌کننده‌ی پرداخت). کارمندانِ غیرفعال هم
 * هستند: سندهای قدیمی‌شان هنوز در دفترند. فهرست به `UserView` بسته است؛ بی آن خالی می‌ماند و
 * بقیه‌ی فیلترها کار می‌کنند.
 */
export default function UserFilterSelect({ label, value, onSelect }) {
  const { data, isLoading } = useAllUsersQuery(ALL_ROWS, { retry: false });
  const users = data?.userList ?? NO_USERS;

  return (
    <EntitySelect
      label={label}
      placeholder="همه"
      emptyText="کارمندی یافت نشد"
      items={users}
      value={value}
      onSelect={onSelect}
      isLoading={isLoading}
      getLabel={nameOf}
    />
  );
}
