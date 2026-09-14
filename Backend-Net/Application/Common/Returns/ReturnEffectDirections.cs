using Domain.Enums;

namespace Application.Common.Returns
{
    /// <summary>Which effects move goods (executed by ExecuteGoodsRound) and which move money (ExecuteMoneyEffect).</summary>
    public static class ReturnEffectDirections
    {
        public static bool IsGoods(ReturnEffectDirectionEnum direction) =>
            direction is ReturnEffectDirectionEnum.GOODS_IN or ReturnEffectDirectionEnum.GOODS_OUT
                or ReturnEffectDirectionEnum.GOODS_RELEASE or ReturnEffectDirectionEnum.GOODS_SCRAP;

        public static bool IsMoney(ReturnEffectDirectionEnum direction) =>
            direction is ReturnEffectDirectionEnum.MONEY_IN or ReturnEffectDirectionEnum.MONEY_OUT;
    }
}
