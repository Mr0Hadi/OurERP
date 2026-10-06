export const purchaseReturnKeys = {
  all: ['purchaseReturns'],
  lists: () => [...purchaseReturnKeys.all, 'list'],
  list: (filters) => [...purchaseReturnKeys.lists(), { ...filters }],
  details: () => [...purchaseReturnKeys.all, 'detail'],
  detail: (id) => [...purchaseReturnKeys.details(), String(id)],
  returnablePurchases: () => [...purchaseReturnKeys.all, 'returnable-purchases'],
  returnablePurchasesSearch: (search) => [...purchaseReturnKeys.returnablePurchases(), search],
  // `GetPurchaseReceivingInfo` هیچ پارامتری جز `purchaseId` ندارد، پس یک
  // کلید برای هر خرید کافی است.
  purchaseForReturn: (purchaseId) => [...purchaseReturnKeys.all, 'purchase-for-return', String(purchaseId)],
};
