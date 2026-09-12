// صفِ دریافت و جزئیاتِ دریافتِ یک خرید. جدا از `purchaseKeys` می‌ماند
// چون داده‌ی پشتشان هم جداست: صف روی `GetPurchaseList`ِ فیلترشده و
// جزئیات روی `GetPurchaseReceivingInfo` می‌نشیند، نه `GetPurchaseDetail`.
export const receivingKeys = {
  all: ['receiving'],
  lists: () => [...receivingKeys.all, 'list'],
  list: (filters) => [...receivingKeys.lists(), { ...filters }],
  details: () => [...receivingKeys.all, 'detail'],
  detail: (purchaseId) => [...receivingKeys.details(), String(purchaseId)],
};
