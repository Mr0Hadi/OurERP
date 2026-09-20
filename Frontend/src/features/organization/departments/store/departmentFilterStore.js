import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * دو فیلترِ مستقلِ `GetDepartmentList` با همان نام‌های سرور: `name` روی
 * نامِ واحد و `headName` روی نامِ مسئول؛ سرور آن‌ها را AND می‌کند.
 *
 * مرتب‌سازی ندارد: این endpoint پارامترِ مرتب‌سازی نمی‌گیرد.
 */
export const useDepartmentFilterStore = createFilterStore({
  filters: { name: "", headName: "" },
  defaultSorting: null,
});
