export const SALE_STATUSES = {
  PENDING: "pending",
  PROCESSING: "processing",
  PARTIALLY_DELIVERED: "partially_delivered",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export const SALE_STATUS_LABELS = {
  [SALE_STATUSES.PENDING]: "در انتظار",
  [SALE_STATUSES.PROCESSING]: "در حال پردازش",
  [SALE_STATUSES.PARTIALLY_DELIVERED]: "تحویل ناقص",
  [SALE_STATUSES.DELIVERED]: "تحویل کامل",
  [SALE_STATUSES.CANCELLED]: "لغو شده",
};

export const PAYMENT_TYPES = {
  CASH: "cash",
  CREDIT: "credit",
  CHECK: "check",
  TRANSFER: "transfer",
  MIXED: "mixed",
};

export const PAYMENT_TYPE_LABELS = {
  [PAYMENT_TYPES.CASH]: "نقدی",
  [PAYMENT_TYPES.CREDIT]: "نسیه",
  [PAYMENT_TYPES.CHECK]: "چک",
  [PAYMENT_TYPES.TRANSFER]: "انتقال بانکی",
  [PAYMENT_TYPES.MIXED]: "ترکیبی",
};
