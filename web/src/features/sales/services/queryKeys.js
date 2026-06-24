export const saleKeys = {
  all: ['sales'],
  lists: () => [...saleKeys.all, 'list'],
  list: (params) => [...saleKeys.lists(), params],
  details: () => [...saleKeys.all, 'detail'],
  detail: (id) => [...saleKeys.details(), id],
};
