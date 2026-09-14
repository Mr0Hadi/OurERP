using Application.Common.Dtos.Returns;

namespace Application.Common.Returns
{
    /// <summary>
    /// Shape rules for scanned barcodes on a goods-round line, shared by both ExecuteGoodsRound validators.
    /// Counts only: whether each barcode exists, belongs to the product, is in the right status, and whether an
    /// observation's barcodes are among the line's, is checked by ProductUnitService after normalization.
    /// </summary>
    public static class GoodsRoundBarcodes
    {
        public const string CountMismatchMessage =
            "تعداد بارکدهای اسکن‌شده باید با مقدار اجرا برابر باشد، و هر مشاهده دقیقاً به تعداد خودش بارکد داشته باشد؛ مشاهده فقط وقتی بارکد دارد که کل مرحله اسکن شده باشد.";

        /// <summary>Line barcodes, when sent, number exactly Quantity; observation barcodes appear only when the line has
        /// barcodes, and then number exactly each observation's Quantity.</summary>
        public static bool CountsMatch(GoodsRoundLineDto line)
        {
            var lineCount = line.ProductUnitBarcodes?.Count ?? 0;
            var observations = line.Observations ?? new();

            if (lineCount == 0)
                return observations.All(o => (o.ProductUnitBarcodes?.Count ?? 0) == 0);

            return lineCount == line.Quantity
                && observations.All(o => (o.ProductUnitBarcodes?.Count ?? 0) == Math.Max(0, o.Quantity));
        }
    }
}
