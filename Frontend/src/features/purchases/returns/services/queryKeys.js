export const purchaseReturnKeys = {
  all: ['purchaseReturns'],
  lists: () => [...purchaseReturnKeys.all, 'list'],
  list: (filters) => [...purchaseReturnKeys.lists(), { ...filters }],
  details: () => [...purchaseReturnKeys.all, 'detail'],
  detail: (id) => [...purchaseReturnKeys.details(), String(id)],
  returnablePurchases: () => [...purchaseReturnKeys.all, 'returnable-purchases'],
  returnablePurchasesSearch: (search) => [...purchaseReturnKeys.returnablePurchases(), search],
  // excludeReturnId جدا نگه داشته می‌شود چون همین خرید از دو جای مختلف
  // با ورودی‌های متفاوت خوانده می‌شود: صفحه‌ی ثبت مرجوعی جدید (بدون
  // exclude) و صفحه‌ی جزئیات یک مرجوعی (با exclude خودش). یک‌کاسه‌کردن
  // این دو زیر یک کلید یعنی کش یکی، دادهٔ دیگری را نشان می‌دهد.
  //
  // purchaseForReturnAll یک پیشوندِ کوتاه‌تر است — همیشه با این یکی
  // invalidate کنید تا هر دو حالت (با و بدون exclude) باطل شوند.
  purchaseForReturnAll: (purchaseId) => [
    ...purchaseReturnKeys.all,
    'purchase-for-return',
    String(purchaseId),
  ],
  purchaseForReturn: (purchaseId, excludeReturnId = null) => [
    ...purchaseReturnKeys.purchaseForReturnAll(purchaseId),
    excludeReturnId != null ? String(excludeReturnId) : 'none',
  ],
};
