// src/features/employees/store/employeeFilterStore.js
import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * `isActive` عمداً رشته است ("" | "1" | "0") نه boolean: مقدار مستقیم از
 * Select می‌آید و «همه» باید از «غیرفعال» قابل تفکیک بماند — با boolean،
 * `false` و «فیلتر نشده» یکی می‌شدند.
 */
export const useEmployeeFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    roleId: "",
    isActive: "",
  },
});
