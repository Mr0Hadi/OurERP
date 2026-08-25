// src/features/employees/services/queryKeys.js
export const employeeKeys = {
  all: ["employees"],
  lists: () => [...employeeKeys.all, "list"],
  list: (filters) => [...employeeKeys.lists(), { ...filters }],
  details: () => [...employeeKeys.all, "detail"],
  detail: (id) => [...employeeKeys.details(), String(id)],
};
