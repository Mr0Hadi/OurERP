export const receivingKeys = {
  all: ['receiving'],
  lists: () => [...receivingKeys.all, 'list'],
  list: (filters) => [...receivingKeys.lists(), { ...filters }],
  details: () => [...receivingKeys.all, 'detail'],
  detail: (id) => [...receivingKeys.details(), id],
};
