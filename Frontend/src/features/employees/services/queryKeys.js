export const userKeys = {
  all: ["users"],
  lists: () => [...userKeys.all, "list"],
  list: (params) => [...userKeys.lists(), { ...params }],
  details: () => [...userKeys.all, "detail"],
  detail: (id) => [...userKeys.details(), String(id)],
};
