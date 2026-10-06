/**
 * قرارداد با `saleId` خوانده می‌شود (هر فروش یک قراردادِ جاری دارد)، پس کلیدِ جزئیات
 * شناسه‌ی فروش است نه قرارداد.
 */
export const installmentKeys = {
  all: ["saleInstallments"],
  lists: () => [...installmentKeys.all, "list"],
  installmentList: (params) => [...installmentKeys.lists(), "installments", params],
  planList: (params) => [...installmentKeys.lists(), "plans", params],
  plans: () => [...installmentKeys.all, "plan"],
  planOfSale: (saleId) => [...installmentKeys.plans(), String(saleId)],
};
