export const shippingKeys = {
  all: ['shipping'],
  lists: () => [...shippingKeys.all, 'list'],
  list: (filters) => [...shippingKeys.lists(), { ...filters }],
  details: () => [...shippingKeys.all, 'detail'],
  detail: (id) => [...shippingKeys.details(), String(id)],
};

// صف یکپارچه‌ی ارسال انبار (فروش عادی + ارسال کالای جایگزین مرجوعی)
export const outgoingQueueKeys = {
  all: ['outgoingQueue'],
  lists: () => [...outgoingQueueKeys.all, 'list'],
  list: (filters) => [...outgoingQueueKeys.lists(), { ...filters }],
};