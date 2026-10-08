export const customerKeys = {
  all: ["customers"],
  lists: () => [...customerKeys.all, "list"],
  list: (filters) => [...customerKeys.lists(), { ...filters }],
  options: () => [...customerKeys.lists(), "options"],
  details: () => [...customerKeys.all, "detail"],
  detail: (id) => [...customerKeys.details(), String(id)],
};