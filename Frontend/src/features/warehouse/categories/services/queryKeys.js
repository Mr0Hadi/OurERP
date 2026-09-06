export const productCategoryKeys = {
  all: ["productCategories"],
  lists: () => [...productCategoryKeys.all, "list"],
  list: (filters) => [...productCategoryKeys.lists(), { ...filters }],
};
