// src/features/organization/teams/services/queryKeys.js
export const teamKeys = {
  all: ["teams"],
  lists: () => [...teamKeys.all, "list"],
  list: (filters) => [...teamKeys.lists(), { ...filters }],
  options: (departmentId) => [...teamKeys.all, "options", String(departmentId ?? "")],
  details: () => [...teamKeys.all, "detail"],
  detail: (id) => [...teamKeys.details(), String(id)],
};
