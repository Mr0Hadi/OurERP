export const supplierKeys = {
  all: ["suppliers"],
  lists: () => [...supplierKeys.all, "list"],
  list: (filters) => [...supplierKeys.lists(), { ...filters }],
  details: () => [...supplierKeys.all, "detail"],
  detail: (id) => [...supplierKeys.details(), id],
};
