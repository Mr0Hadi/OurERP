// src/features/organization/departments/services/queryKeys.js
export const departmentKeys = {
  all: ["departments"],
  lists: () => [...departmentKeys.all, "list"],
  list: (filters) => [...departmentKeys.lists(), { ...filters }],
  options: () => [...departmentKeys.all, "options"],
  details: () => [...departmentKeys.all, "detail"],
  detail: (id) => [...departmentKeys.details(), String(id)],
};
