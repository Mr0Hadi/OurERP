export const productCategoryKeys = {
  all: ["productCategories"],
  lists: () => [...productCategoryKeys.all, "list"],
  list: (filters) => [...productCategoryKeys.lists(), { ...filters }],
  products: () => [...productCategoryKeys.all, "products"],
  productList: (filters) => [...productCategoryKeys.products(), { ...filters }],
};
