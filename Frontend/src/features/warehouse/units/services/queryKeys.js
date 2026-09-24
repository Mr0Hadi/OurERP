export const productUnitKeys = {
  all: ["productUnits"],
  lists: () => [...productUnitKeys.all, "list"],
  list: (params) => [...productUnitKeys.lists(), { ...params }],
  summaries: () => [...productUnitKeys.all, "summary"],
  summary: (productId) => [...productUnitKeys.summaries(), String(productId ?? "")],
  history: (productUnitId) => [...productUnitKeys.all, "history", String(productUnitId)],
  stocktake: (productId) => [...productUnitKeys.all, "stocktake", String(productId)],
};
