// src/features/warehouse/units/services/queryKeys.js
export const productUnitKeys = {
  all: ["productUnits"],
  lists: () => [...productUnitKeys.all, "list"],
  list: (filters) => [...productUnitKeys.lists(), { ...filters }],
  byCode: (code) => [...productUnitKeys.all, "byCode", String(code ?? "")],
  summary: () => [...productUnitKeys.all, "summary"],
};

// کالاهایی که هنوز به‌اندازه‌ی موجودی‌شان برچسب ندارند
export const pendingLabelKeys = {
  all: ["pendingLabels"],
  lists: () => [...pendingLabelKeys.all, "list"],
  list: (filters) => [...pendingLabelKeys.lists(), { ...filters }],
};
