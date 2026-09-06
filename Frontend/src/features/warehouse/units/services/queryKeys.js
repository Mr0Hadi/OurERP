export const productUnitKeys = {
  all: ["productUnits"],
  lists: () => [...productUnitKeys.all, "list"],
  list: (filters) => [...productUnitKeys.lists(), { ...filters }],
  byCode: (code) => [...productUnitKeys.all, "byCode", String(code ?? "")],
};
