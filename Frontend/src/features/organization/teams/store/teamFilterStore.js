import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * دو فیلترِ `GetTeamList` با همان نام‌های سرور: `name` روی نامِ تیم و
 * `departmentId` (عددی؛ رشته‌ی خالی یعنی «همه»).
 *
 * مرتب‌سازی ندارد: این endpoint پارامترِ مرتب‌سازی نمی‌گیرد.
 */
export const useTeamFilterStore = createFilterStore({
  filters: { name: "", departmentId: "" },
  defaultSorting: null,
});
