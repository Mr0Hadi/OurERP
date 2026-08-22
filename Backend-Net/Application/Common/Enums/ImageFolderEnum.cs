using System.ComponentModel;

namespace Application.Common.Enums
{
    /// <summary>
    /// Which logical folder (object-key prefix) an uploaded image lands in. The caller picks it
    /// so images stay browsable/prunable per feature in the bucket; it is not a security boundary -
    /// every object in the bucket is readable by anyone holding a valid signed URL.
    /// </summary>
    public enum ImageFolderEnum
    {
        [Description("محصولات")]
        PRODUCTS = 1,

        [Description("مشتریان")]
        CUSTOMERS = 2,

        [Description("تامین‌کنندگان")]
        SUPPLIERS = 3,

        [Description("رسید کالا")]
        RECEIVING = 4,
    }
}
