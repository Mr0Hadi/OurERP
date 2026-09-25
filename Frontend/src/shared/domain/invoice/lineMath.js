import { TaxCategoryEnum } from "@/shared/domain/enums/taxCategory";

/**
 * پیش‌نمایشِ مبالغِ یک قلمِ فاکتور — همان قاعده‌ی `InvoiceLineMath`ِ سرور
 * (api-guide، ابتدای بخش ۹):
 *
 *   gross    = quantity × unitPrice
 *   discount = round(gross × discount% / 100)
 *   net      = gross − discount
 *   tax      = round(net × tax% / 100)   (کالای معاف: ۰)
 *   total    = net + tax
 *
 * گرد کردن نیم به بالا و **برای هر قلم جدا** است؛ برای مبالغ مثبت همان
 * `Math.round`. این فقط برای نمایش در فرم است — بعد از ذخیره همیشه
 * عددهای خودِ سرور نشان داده می‌شوند.
 *
 * `taxPercent` روی قلمی که از سرور آمده هست؛ روی قلمِ تازه‌ای که از
 * فهرستِ کالا انتخاب شده نیست (لیستِ کالا نرخ مالیات را نمی‌دهد)، پس
 * `taxKnown` می‌گوید مالیاتِ این قلم واقعاً حساب شده یا صفر فرض شده.
 */
export function invoiceLineAmounts(item) {
  const quantity = Number(item?.quantity) || 0;
  const unitPrice = Number(item?.unitPrice) || 0;
  const discountPercent = Number(item?.discount) || 0;
  const exempt = Number(item?.taxCategory) === TaxCategoryEnum.EXEMPT;
  const taxKnown = exempt || item?.taxPercent != null;
  const taxPercent = exempt ? 0 : Number(item?.taxPercent) || 0;

  const grossAmount = quantity * unitPrice;
  const discountAmount = Math.round((grossAmount * discountPercent) / 100);
  const netAmount = grossAmount - discountAmount;
  const taxAmount = Math.round((netAmount * taxPercent) / 100);

  return {
    grossAmount,
    discountAmount,
    netAmount,
    taxAmount,
    totalAmount: netAmount + taxAmount,
    taxKnown,
  };
}

/** جمعِ فاکتور = جمعِ «جمعِ قلم»ها، به‌علاوه‌ی جمعِ مالیات برای نمایش. */
export function invoiceTotals(items = []) {
  return items.reduce(
    (sum, item) => {
      const line = invoiceLineAmounts(item);
      return {
        netAmount: sum.netAmount + line.netAmount,
        taxAmount: sum.taxAmount + line.taxAmount,
        totalAmount: sum.totalAmount + line.totalAmount,
        taxUnknown: sum.taxUnknown || !line.taxKnown,
      };
    },
    { netAmount: 0, taxAmount: 0, totalAmount: 0, taxUnknown: false },
  );
}
