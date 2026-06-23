const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// دیتای موک برای خریدها (در حافظه)
let allPurchases = [];

export const createPurchase = async (purchaseData) => {
  await delay(800);
  if (Math.random() < 0.1) throw new Error('خطا در ثبت خرید');

  const newPurchase = {
    id: String(Date.now()),
    ...purchaseData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  allPurchases.unshift(newPurchase);
  return newPurchase;
};

// در صورت نیاز به لیست خریدها
export const fetchPurchases = async (params) => {
  await delay(500);
  // پیاده‌سازی مشابه محصولات (فیلتر، صفحه‌بندی)
  // ...
};

export const fetchPurchaseById = async (id) => {
  await delay(300);
  const purchase = allPurchases.find((p) => p.id === id);
  if (!purchase) throw new Error('خرید یافت نشد');
  return purchase;
};