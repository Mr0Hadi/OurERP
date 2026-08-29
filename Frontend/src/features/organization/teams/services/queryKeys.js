// src/features/organization/teams/services/queryKeys.js
export const teamKeys = {
  all: ["teams"],
  lists: () => [...teamKeys.all, "list"],
  list: (filters) => [...teamKeys.lists(), { ...filters }],
  // فهرستِ options به ازای هر واحد جدا کش می‌شود؛ بدون این، انتخابگرِ
  // تیمِ یک واحد نتیجه‌ی واحدِ قبلی را نشان می‌داد.
  options: (departmentId = "") => [...teamKeys.all, "options", String(departmentId)],
  details: () => [...teamKeys.all, "detail"],
  detail: (id) => [...teamKeys.details(), String(id)],
};
