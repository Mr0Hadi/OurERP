using System.ComponentModel;

namespace Domain.Enums
{
    public enum ProductUnitEnum
    {
        [Description("دست")]
        Hand,
        [Description("عدد")]
        Number,
        [Description("کارتن")]
        Box,
        [Description("لیتر")]
        Liter,
        [Description("کیلوگرم")]
        Kg,
        [Description("کیت")]
        Kit,
        [Description("بسته")]
        Package,
        [Description("جفت")]
        Pair
    }
}
