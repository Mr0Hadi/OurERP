export const customerKeys = {
  all: ["customers"],
  lists: () => [...customerKeys.all, "list"],
  list: (filters) => [...customerKeys.lists(), { ...filters }],
  details: () => [...customerKeys.all, "detail"],
  detail: (id) => [...customerKeys.details(), id],
};
