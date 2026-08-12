using System.ComponentModel.DataAnnotations;

namespace Application.Common.Enums
{
    public enum ResponseMessageTypeEnum
    {
        [Display(Description = "موفق")]
        Success = 1,
        [Display(Description = "هشدار")]
        Warning = 2,
        [Display(Description = "اخطار")]
        Danger = 3
    }
}
