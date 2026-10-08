export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (filters) => [...productKeys.lists(), { ...filters }],
  options: () => [...productKeys.lists(), 'options'],
  search: (term, categoryId = '') => [...productKeys.lists(), 'search', term, String(categoryId)],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), String(id)],
};