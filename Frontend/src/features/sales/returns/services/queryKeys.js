export const salesReturnKeys = {
  all: ['salesReturns'],
  lists: () => [...salesReturnKeys.all, 'list'],
  list: (filters) => [...salesReturnKeys.lists(), { ...filters }],
  details: () => [...salesReturnKeys.all, 'detail'],
  detail: (id) => [...salesReturnKeys.details(), String(id)],
  returnableSales: () => [...salesReturnKeys.all, 'returnable-sales'],
  returnableSalesSearch: (search) => [...salesReturnKeys.returnableSales(), search],
  // `GetSaleDetail` جز شناسه پارامتری ندارد؛ یک کلید برای هر فروش.
  saleForReturn: (saleId) => [...salesReturnKeys.all, 'sale-for-return', String(saleId)],
};
