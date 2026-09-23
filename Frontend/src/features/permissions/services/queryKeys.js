export const permissionKeys = {
  all: ["permissions"],
  users: () => [...permissionKeys.all, "user"],
  user: (userId) => [...permissionKeys.users(), String(userId)],
  templates: () => [...permissionKeys.all, "departmentTemplate"],
  template: (departmentId) => [...permissionKeys.templates(), String(departmentId)],
};
