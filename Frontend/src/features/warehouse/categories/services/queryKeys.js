// src/features/warehouse/categories/services/queryKeys.js
export const productCategoryKeys = {
  all: ["productCategories"],
  lists: () => [...productCategoryKeys.all, "list"],
  list: (filters) => [...productCategoryKeys.lists(), { ...filters }],
};
