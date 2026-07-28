export const purchaseReturnKeys = {
  all: ['purchaseReturns'],
  lists: () => [...purchaseReturnKeys.all, 'list'],
  list: (filters) => [...purchaseReturnKeys.lists(), { ...filters }],
  details: () => [...purchaseReturnKeys.all, 'detail'],
  detail: (id) => [...purchaseReturnKeys.details(), String(id)],
  reports: () => [...purchaseReturnKeys.all, 'shortage-reports'],
  reportDetail: (purchaseId) => [...purchaseReturnKeys.reports(), String(purchaseId)],
};