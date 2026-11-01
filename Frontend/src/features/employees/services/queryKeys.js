export const userKeys = {
  all: ["users"],
  lists: () => [...userKeys.all, "list"],
  list: (params) => [...userKeys.lists(), { ...params }],
  options: (includeInactive) => [...userKeys.lists(), "options", Boolean(includeInactive)],
  details: () => [...userKeys.all, "detail"],
  detail: (id) => [...userKeys.details(), String(id)],
};
