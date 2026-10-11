export const vehicleKeys = {
  all: ["vehicles"],
  lists: () => [...vehicleKeys.all, "list"],
  products: () => [...vehicleKeys.all, "products"],
  productList: (filters) => [...vehicleKeys.products(), { ...filters }],
};
