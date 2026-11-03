export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (filters) => [...productKeys.lists(), { ...filters }],
  search: (term, categoryId = '') => [...productKeys.lists(), 'search', term, String(categoryId)],
  brands: (search) => [...productKeys.lists(), 'brands', search],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), String(id)],
};