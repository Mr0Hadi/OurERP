// صفِ ارسال و جزئیاتِ ارسالِ یک فروش. جدا از `saleKeys` می‌ماند چون صف
// روی `GetSaleList`ِ فیلترشده می‌نشیند و کشِ خودش را دارد.
export const shippingKeys = {
  all: ['shipping'],
  lists: () => [...shippingKeys.all, 'list'],
  list: (filters) => [...shippingKeys.lists(), { ...filters }],
  details: () => [...shippingKeys.all, 'detail'],
  detail: (saleId) => [...shippingKeys.details(), String(saleId)],
};
