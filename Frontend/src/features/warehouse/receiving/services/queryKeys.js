export const receivingKeys = {
  all: ['receiving'],
  lists: () => [...receivingKeys.all, 'list'],
  list: (filters) => [...receivingKeys.lists(), { ...filters }],
  details: () => [...receivingKeys.all, 'detail'],
  detail: (id) => [...receivingKeys.details(), String(id)],
};

// صف یکپارچه‌ی «چیزهایی که باید به انبار برسند» (خرید + مرجوعی فروش)
export const incomingQueueKeys = {
  all: ['incomingQueue'],
  lists: () => [...incomingQueueKeys.all, 'list'],
  list: (filters) => [...incomingQueueKeys.lists(), { ...filters }],
};
