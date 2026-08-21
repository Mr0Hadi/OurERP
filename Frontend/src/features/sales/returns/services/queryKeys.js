export const salesReturnKeys = {
  all: ['salesReturns'],
  lists: () => [...salesReturnKeys.all, 'list'],
  list: (filters) => [...salesReturnKeys.lists(), { ...filters }],
  details: () => [...salesReturnKeys.all, 'detail'],
  detail: (id) => [...salesReturnKeys.details(), String(id)],
  returnableSales: () => [...salesReturnKeys.all, 'returnable-sales'],
  returnableSalesSearch: (search) => [...salesReturnKeys.returnableSales(), search],
  // excludeReturnId جدا نگه داشته می‌شود چون همین فروش از دو جای مختلف
  // با ورودی‌های متفاوت خوانده می‌شود: صفحه‌ی ثبت مرجوعی جدید (بدون
  // exclude) و صفحه‌ی جزئیات یک مرجوعی (با exclude خودش). یک‌کاسه‌کردن
  // این دو زیر یک کلید یعنی کش یکی، دادهٔ دیگری را نشان می‌دهد.
  //
  // saleForReturnAll یک پیشوندِ کوتاه‌تر است — همیشه با این یکی
  // invalidate کنید تا هر دو حالت (با و بدون exclude) باطل شوند.
  saleForReturnAll: (saleId) => [
    ...salesReturnKeys.all,
    'sale-for-return',
    String(saleId),
  ],
  saleForReturn: (saleId, excludeReturnId = null) => [
    ...salesReturnKeys.saleForReturnAll(saleId),
    excludeReturnId != null ? String(excludeReturnId) : 'none',
  ],
};
