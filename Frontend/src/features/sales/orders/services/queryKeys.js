export const saleKeys = {
  all: ['sales'],
  lists: () => [...saleKeys.all, 'list'],
  list: (params) => [...saleKeys.lists(), params],
  details: () => [...saleKeys.all, 'detail'],
  detail: (id) => [...saleKeys.details(), String(id)],
};

export const warehouseIssueKeys = {
  all: ['saleWarehouseIssues'],
  lists: () => [...warehouseIssueKeys.all, 'list'],
  list: (params) => [...warehouseIssueKeys.lists(), params],
};
