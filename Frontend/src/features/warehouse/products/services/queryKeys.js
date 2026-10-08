export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (filters) => [...productKeys.lists(), { ...filters }],
  options: () => [...productKeys.lists(), 'options'],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), String(id)],
};