import { unitLabelOf } from "@/shared/domain/enums/productUnit";

/**
 * قلمِ تازه‌ی فاکتور از روی کالا — تنها جایی که شکلِ قلم ساخته می‌شود.
 *
 * `product` باید جزئیاتِ کاملِ کالا باشد (`GetProductDetail`)، نه ردیفِ لیست:
 * قیمتِ خرید، واحد و نرخِ مالیات فقط آن‌جاست.
 *
 * @param {object} product
 * @param {object} options
 * @param {number} options.unitPrice قیمتِ اولیه (خرید یا فروش، به انتخابِ فراخوان)
 * @param {number} [options.quantity]
 * @param {string[]} [options.productUnitBarcodes] دانه‌های اسکن‌شده برای کالای ردیابی‌دار
 */
export function lineFromProduct(product, { unitPrice, quantity = 1, productUnitBarcodes } = {}) {
  return {
    productId: product.id,
    productName: product.name,
    productCode: product.code,
    unit: unitLabelOf(product.unit),
    quantity,
    unitPrice: Number(unitPrice) || 0,
    discount: 0,
    ...(product.tax != null && {
      taxPercent: Number(product.tax) || 0,
      taxCategory: product.taxCategory,
    }),
    ...(productUnitBarcodes?.length && { productUnitBarcodes }),
  };
}
