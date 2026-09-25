using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// Our own tax label for a product and for each invoice line that snapshots it - not the tax-authority (Moadian)
    /// classification, which is a separate, richer set of codes. Starts at 1 so an unset value (0) is caught. New members are
    /// appended (e.g. a zero-rated category, which is not the same thing as exempt) - never renumber.
    /// </summary>
    public enum TaxCategoryEnum
    {
        [Description("مشمول مالیات")]
        TAXABLE = 1,

        [Description("معاف از مالیات")]
        EXEMPT = 2,
    }
}
