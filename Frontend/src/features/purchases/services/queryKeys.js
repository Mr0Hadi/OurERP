export const purchaseKeys = {
  all: ['purchases'],
  lists: () => [...purchaseKeys.all, 'list'],
  list: (filters) => [...purchaseKeys.lists(), { ...filters }],
  details: () => [...purchaseKeys.all, 'detail'],
  detail: (id) => [...purchaseKeys.details(), String(id)],
};