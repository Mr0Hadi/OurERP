using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>A manual warehouse action on units (ApplyProductUnitAction). Numbers are a frontend contract.</summary>
    public enum ProductUnitActionEnum
    {
        [Description("انتقال به قرنطینه")]
        QUARANTINE = 1,

        [Description("بازگشت به موجودی")]
        RELEASE = 2,

        [Description("اسقاط")]
        SCRAP = 3,
    }
}
