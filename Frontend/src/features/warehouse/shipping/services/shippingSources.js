/**
 * منبعِ هر خطِ یک حواله‌ی خروج.
 *
 * قرینه‌ی RECEIVING_SOURCES در سمت دریافت: یک ماشینی که از انبار
 * بیرون می‌رود می‌تواند هم‌زمان کالای خودِ فروش را ببرد و هم کالای
 * جایگزینی که بابت یک مرجوعی به مشتری بدهکاریم. یک ماشین، یک حواله.
 */
export const SHIPPING_SOURCES = {
  ORDER: "order",
  RETURN: "return",
};

export const SHIPPING_SOURCE_LABELS = {
  [SHIPPING_SOURCES.ORDER]: "اقلام فروش",
  [SHIPPING_SOURCES.RETURN]: "اقلام مرجوعی",
};
