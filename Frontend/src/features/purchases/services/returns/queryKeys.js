export const purchaseReturnKeys = {
  all: ['purchaseReturns'],
  lists: () => [...purchaseReturnKeys.all, 'list'],
  list: (filters) => [...purchaseReturnKeys.lists(), { ...filters }],
  details: () => [...purchaseReturnKeys.all, 'detail'],
  detail: (id) => [...purchaseReturnKeys.details(), String(id)],
  returnable: () => [...purchaseReturnKeys.all, 'returnable-purchases'],
  returnableDetail: (id) => [...purchaseReturnKeys.returnable(), String(id)],
};