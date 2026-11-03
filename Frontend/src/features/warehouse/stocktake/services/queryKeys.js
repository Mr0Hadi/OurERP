export const stocktakeKeys = {
  all: ["stocktakes"],
  lists: () => [...stocktakeKeys.all, "list"],
  list: (params) => [...stocktakeKeys.lists(), params],
  details: () => [...stocktakeKeys.all, "detail"],
  detail: (id) => [...stocktakeKeys.details(), String(id)],
};
