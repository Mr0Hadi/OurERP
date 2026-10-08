export const supplierKeys = {
  all: ["suppliers"],
  lists: () => [...supplierKeys.all, "list"],
  list: (filters) => [...supplierKeys.lists(), { ...filters }],
  options: () => [...supplierKeys.lists(), "options"],
  details: () => [...supplierKeys.all, "detail"],
  detail: (id) => [...supplierKeys.details(), String(id)],
};