import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای فهرستِ حواله‌ها، با همان نام‌های `GetStockTransferListQuery`. پیش‌فرضِ سرور: تازه‌ترین ارسال اول. */
export const useStockTransferFilterStore = createFilterStore({
  filters: {
    search: "",
    statuses: [],
    fromWarehouseId: "",
    toWarehouseId: "",
    fromDate: "",
    toDate: "",
  },
  defaultSorting: { id: "dispatchedAt", desc: true },
});
